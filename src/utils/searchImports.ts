import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';

import escape from 'escape-string-regexp';
import type { ExecaChildProcess } from 'execa';
import { execa } from 'execa';
import vscode from 'vscode';

import { pathExists } from './fs';
import { store } from './store';
import { configuration } from '../configuration';
import { logger } from '../logger';

const isWin = process.platform.startsWith('win');
const rgExe = isWin ? 'rg.exe' : 'rg';

async function getRgPath() {
    const candidateDirs = [
        'node_modules/vscode-ripgrep/bin/',
        'node_modules.asar.unpacked/vscode-ripgrep/bin/',
        'node_modules/@vscode/ripgrep/bin/',
        'node_modules.asar.unpacked/@vscode/ripgrep/bin/',
    ];
    for (const dir of candidateDirs) {
        if (await pathExists(resolve(vscode.env.appRoot, dir, rgExe))) {
            return rgExe;
        }
    }

    const message = "can't find ripgrep path";
    await vscode.window.showErrorMessage(message);
    throw new Error(message);
}

function getImportStatementRegexp(dep: string) {
    const escapedDepName = escape(dep);
    // import(/* webpackChunkName: "heic2any" */ 'heic2any');
    const magicComment = `(/\\*\\s*webpackChunkName:\\s*['"][a-zA-Z\\d\\-_.]+['"]\\s*\\*/)`;
    const modulePath = `${magicComment}?\\s*['"]${escapedDepName}(/[a-zA-Z\\d\\-_.]+)*(\\?\\S*)?['"]`;
    // require ( 'lodash'   )
    const requireRegexp = `require\\s*\\(\\s*${modulePath}\\s*\\)\\s*;?`;
    // import { add } from 'lodash';
    const importRegexp = `import\\s+(type\\s+)?[$_a-zA-Z,\{\\\\}\\s]+\\s+from\\s+${modulePath}\\s*;?`;
    // import 'core-js/stable'
    const unassignedImportRegexp = `import\\s+${modulePath};?`;
    // await import ('lodash')
    // const dynamicImportRegexp = `import\\s+(type\\s+)?\\s*\\(${modulePath}\\)\\s*;?`;
    const dynamicImportRegexp = `import\\s*\\(${modulePath}\\)\\s*;?`;
    return [requireRegexp, importRegexp, unassignedImportRegexp, dynamicImportRegexp].join('|');
}

export interface SearchImportsMatch {
    searchedDep: string;
    absPath: string;
    line: number;
    column: number;
    lineStr: string;
    importStatement: string;
    isTypeImport: boolean;
}

const lineRegexp = /^(?<absPath>.*):(?<line>\d+):(?<column>\d+):(?<lineStr>.*)/;
function parseSearchResultLine(
    line: string,
    importRegexpStr: string,
    searchedDep: string,
): SearchImportsMatch | undefined {
    const matchArray = line.match(lineRegexp);
    if (matchArray && matchArray.groups) {
        const { groups } = matchArray;
        const { absPath, lineStr } = groups;
        const line = Number.parseInt(groups.line, 10) - 1;
        const column = Number.parseInt(groups.column, 10) - 1;
        const importRegexp = new RegExp(`^${importRegexpStr}`);
        const lineSource = lineStr.slice(column);
        const importStatementMatch = lineSource.match(importRegexp);
        const importStatement = importStatementMatch ? importStatementMatch[0] : lineSource;
        return {
            searchedDep,
            absPath,
            line,
            column,
            lineStr,
            importStatement,
            isTypeImport: /^import\s+type\s+/.test(importStatement),
        };
    }

    return undefined;
}

const atTypesLiteral = '@types';
const searchPrecessMap = new Map<string, ExecaChildProcess<string>>();
export async function searchImportDepFiles(dep: string, cwd: string) {
    const storageDir = store.storageDir!;
    if (!(await pathExists(storageDir))) {
        await fs.mkdir(storageDir);
    }
    const uuid = crypto.randomBytes(16).toString('hex');
    const patternFile = resolve(storageDir, `ripgrep-pattern-${uuid}.txt`);
    // @types/xxx should find xxx
    if (dep.startsWith(atTypesLiteral)) {
        dep = dep.slice(atTypesLiteral.length + 1);
    }
    const importStatementRegexp = getImportStatementRegexp(dep);
    // use file to read pattern because regexp string is very complex and may break command
    await fs.writeFile(patternFile, importStatementRegexp, 'utf8');

    // kill previous search process
    const searchProcessKey = JSON.stringify({ dep, cwd });
    if (searchPrecessMap.has(searchProcessKey)) {
        searchPrecessMap.get(searchProcessKey)!.kill();
        searchPrecessMap.delete(searchProcessKey);
    }

    try {
        const start = Date.now();
        const searchProcess = execa(
            await getRgPath(),
            [
                '--no-messages',
                // make every match result one line
                '--vimgrep',
                '--with-filename',
                '--column',
                '--line-number',
                '--no-config',
                '--multiline',
                '--case-sensitive',
                // Don't print lines longer than this limit in bytes. Longer lines are omitted,
                // and only the number of matches in that line is printed.
                '--max-columns',
                '500',
                '--encoding',
                // eslint-disable-next-line unicorn/text-encoding-identifier-case
                'UTF-8',
                // disable colors
                '--color',
                'never',
                // read pattern from file
                '--file',
                patternFile,
                ...configuration.packageJsonDependenciesCodeLens.searchDependenciesFileExtensions.flatMap(
                    (ext) => ['--glob', `**/*.${ext}`],
                ),
                ...configuration.packageJsonDependenciesCodeLens.searchDependenciesExcludePatterns.flatMap(
                    (p) => ['--glob', `!${p}`],
                ),
                // searched folder is cwd
                // use cwd instead of .
                // use . will output relative path, use cwd will output abs path
                cwd,
            ],
            { cwd },
        );
        searchPrecessMap.set(searchProcessKey, searchProcess);
        const { stdout, escapedCommand } = await searchProcess;

        logger.info(`pattern: ${importStatementRegexp.replaceAll('/', '\\/')}`);
        logger.info(`command: ${escapedCommand}`);
        const costs = ((Date.now() - start) / 1000).toFixed(3);
        logger.info(`search ${searchProcessKey} costs: ${costs}s`);

        return stdout
            .trim()
            .split('\n')
            .map((line) => parseSearchResultLine(line, importStatementRegexp, dep))
            .filter(Boolean) as SearchImportsMatch[];
    } catch (error: any) {
        logger.error(error);
        logger.error(`pattern: ${importStatementRegexp.replaceAll('/', '\\/')}`);
        logger.error(`command: ${error.escapedCommand}`);
        if (error.killed) {
            logger.error(`killed search process: ${searchProcessKey}`);
        }
        return [];
    } finally {
        searchPrecessMap.delete(searchProcessKey);
        await fs.unlink(patternFile);
    }
}
