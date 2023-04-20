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

const isWin = process.platform.startsWith('win');
const rgExe = isWin ? 'rg.exe' : 'rg';

async function exePathIsDefined(rgExePath: string) {
    return (await pathExists(rgExePath)) ? rgExePath : false;
}

async function getRgPath() {
    const candidateDirs = [
        'node_modules/vscode-ripgrep/bin/',
        'node_modules.asar.unpacked/vscode-ripgrep/bin/',
        'node_modules/@vscode/ripgrep/bin/',
        'node_modules.asar.unpacked/@vscode/ripgrep/bin/',
    ];
    for (const dir of candidateDirs) {
        const rgPath = await exePathIsDefined(resolve(vscode.env.appRoot, dir, rgExe));
        if (rgPath) return rgPath;
    }

    const message = "can't find ripgrep path";
    await vscode.window.showErrorMessage(message);
    throw new Error(message);
}

function getImportStatementRegexp(dep: string) {
    const escapedDepName = escape(dep);
    // for example: import(/* webpackChunkName: "heic2any" */ 'heic2any');
    const magicComment = `(/\\*\\s*webpackChunkName:\\s*['"][a-zA-Z\\d\\-_]+['"]\\s*\\*/)`;
    const modulePath = `${magicComment}?\\s*['"]${escapedDepName}(/[a-zA-Z\\d\\-_]+)*(\\?\\S*)?['"]`;
    // require ( 'lodash'   )
    const requireRegexp = `require\\s*\\(\\s*${modulePath}\\s*\\)\\s*;?`;
    // import { add } from 'lodash';
    const importRegexp = `import\\s+.+\\s+from\\s${modulePath}\\s*;?`;
    // await import ('lodash')
    const dynamicImportRegexp = `import\\s*\\(${modulePath}\\)\\s*;?`;
    return [requireRegexp, importRegexp, dynamicImportRegexp].join('|');
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

const lineRegexp = /^(?<relativePath>.*):(?<line>\d+):(?<column>\d+):(?<lineStr>.*)/;
function parseSearchResultLine(
    line: string,
    importRegexpStr: string,
    searchedDep: string,
): SearchImportsMatch | undefined {
    const matchArray = line.match(lineRegexp);
    if (matchArray && matchArray.groups) {
        const { groups } = matchArray;
        const { lineStr } = groups;
        const line = Number.parseInt(groups.line, 10) - 1;
        const column = Number.parseInt(groups.column, 10) - 1;
        const importRegexp = new RegExp(`^${importRegexpStr}`);
        const importStatement = lineStr.slice(column).match(importRegexp)![0];
        return {
            searchedDep,
            absPath: groups.relativePath,
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
    }
    try {
        const searchProcess = execa(
            await getRgPath(),
            [
                // '--no-messages',
                '--vimgrep',
                '--with-filename',
                '--column',
                '--line-number',
                '--no-config',
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
        const { stdout } = await searchProcess;
        return stdout
            .trim()
            .split('\n')
            .map((line) => parseSearchResultLine(line, importStatementRegexp, dep))
            .filter(Boolean) as SearchImportsMatch[];
    } catch (error: any) {
        // when no matches, rg exit code is 1
        if (error.stderr) {
            console.error(error.escapedCommand);
            console.error(importStatementRegexp);
        }
        return [];
    } finally {
        searchPrecessMap.delete(searchProcessKey);
        await fs.unlink(patternFile);
    }
}
