import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { cpus } from 'node:os';
import { resolve } from 'node:path';

import type { ExecaChildProcess, ExecaError } from 'execa';
import { execa } from 'execa';
import PQueue from 'p-queue';
import vscode from 'vscode';

import { pathExists } from './fs';
import { store } from './store';
import { configuration } from '../configuration';
import { logger } from '../logger';

/**
 * get vscode bundled ripgrep executable file path
 */
export async function getRgPath() {
    const isWin = process.platform.startsWith('win');
    const rgExe = isWin ? 'rg.exe' : 'rg';

    const candidateDirs = [
        'node_modules/vscode-ripgrep/bin/',
        'node_modules.asar.unpacked/vscode-ripgrep/bin/',
        'node_modules/@vscode/ripgrep/bin/',
        'node_modules.asar.unpacked/@vscode/ripgrep/bin/',
    ];
    for (const dir of candidateDirs) {
        // eslint-disable-next-line no-await-in-loop
        if (await pathExists(resolve(vscode.env.appRoot, dir, rgExe))) {
            return rgExe;
        }
    }

    const message = "can't find ripgrep path";
    await vscode.window.showErrorMessage(message);
    throw new Error(message);
}

/**
 * use file to read pattern because regexp string is very complex and may break command
 */
async function createRegexpFile(regexp: string) {
    const storageDir = store.storageDir!;
    if (!(await pathExists(storageDir))) {
        await fs.mkdir(storageDir);
    }

    const uuid = crypto.randomBytes(16).toString('hex');
    const patternFile = resolve(storageDir, `ripgrep-pattern-${uuid}.txt`);
    await fs.writeFile(patternFile, regexp, 'utf8');
    return patternFile;
}

interface SearchOptions {
    threadCount: number;
    heavy: boolean;
}

const searchPrecessMap = new Map<string, ExecaChildProcess<string>>();
async function _searchByRg(regexpStr: string, cwd: string, options?: Partial<SearchOptions>) {
    const patternFile = await createRegexpFile(regexpStr);

    // kill previous search process
    const searchProcessKey = JSON.stringify({ regexpStr, cwd });
    if (searchPrecessMap.has(searchProcessKey)) {
        searchPrecessMap.get(searchProcessKey)!.kill();
        searchPrecessMap.delete(searchProcessKey);
    }

    const threadArg =
        options?.threadCount === undefined ? [] : ['--threads', `${options.threadCount}`];
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
                ...threadArg,
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

        logger.info(`pattern: ${regexpStr.replaceAll('/', '\\/')}`);
        logger.info(`command: ${escapedCommand}`);
        const costs = ((Date.now() - start) / 1000).toFixed(3);
        logger.info(`search ${searchProcessKey} costs: ${costs}s`);

        return stdout.trim().split('\n');
    } catch (_error: any) {
        const error = _error as ExecaError;
        logger.error(String(error));
        logger.error(`pattern: ${regexpStr.replaceAll('/', '\\/')}`);
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

const cpuCount = cpus().length;
// leave 1/3 cpus to vscode renderer
const rgConcurrentThreadsCount = Math.max(2, Math.ceil(cpuCount * (2 / 3)));
const queue = new PQueue({
    concurrency: rgConcurrentThreadsCount,
});
export async function searchByRg(regexpStr: string, cwd: string, options?: Partial<SearchOptions>) {
    if (options?.heavy) {
        return queue.add(() =>
            _searchByRg(regexpStr, cwd, {
                ...options,
                threadCount: 1,
            }),
        ) as Promise<string[]>;
    }
    return _searchByRg(regexpStr, cwd, options);
}

const lineRegexp = /^(?<absPath>.*):(?<line>\d+):(?<column>\d+):(?<lineStr>.*)/;
export function parseRgOutputLine(outputLine: string) {
    const matchArray = outputLine.match(lineRegexp)!;
    const groups = matchArray.groups!;
    const { absPath, lineStr } = groups;
    const line = Number.parseInt(groups.line, 10) - 1;
    const column = Number.parseInt(groups.column, 10) - 1;
    return {
        absPath,
        line,
        column,
        lineStr,
    };
}
