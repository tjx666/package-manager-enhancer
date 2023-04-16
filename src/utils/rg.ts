import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';

import escape from 'escape-string-regexp';
import { execa } from 'execa';
import vscode from 'vscode';

import { pathExists } from './fs';
import { store } from './store';

const excludePatterns = [
    '**/vendor/**',
    '**/node_modules/**',
    '**/bower_components/**',
    '**/*.code-search/**',
    // output
    '**/dist/**',
    '**/build/**',
    '**/_output/**',
    '**/*.min.*',
    '**/*.map',
    // config files
    '**/.*/**',
].map((p) => `!${p}`);
const searchImportExts = [
    'js',
    'jsx',
    'cjs',
    'mjs',
    'ts',
    'tsx',
    'cts',
    'mts',
    'html',
    'vue',
    'svelte',
];

function exeName() {
    const isWin = process.platform.startsWith('win');
    return isWin ? 'rg.exe' : 'rg';
}

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
        const rgPath = await exePathIsDefined(resolve(vscode.env.appRoot, dir, exeName()));
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
    const requireRegexp = `require\\s*\\(\\s*${modulePath}\\s*\\)\\s*;?`;
    const importRegexp = `\\s+from\\s${modulePath}\\s*;?`;
    const dynamicImportRegexp = `import\\s*\\(${modulePath}\\)\\s*;?`;
    return [requireRegexp, importRegexp, dynamicImportRegexp].join('|');
}

export async function searchImportDepFiles(dep: string, cwd: string) {
    const storageDir = store.storageDir!;
    if (!(await pathExists(storageDir))) {
        await fs.mkdir(storageDir);
    }
    const uuid = crypto.randomBytes(16).toString('hex');
    const patternFile = resolve(storageDir, `ripgrep-pattern-${uuid}.txt`);
    const importStatementRegexp = getImportStatementRegexp(dep);
    // use file to read pattern because regexp string is very complex and may break command
    await fs.writeFile(patternFile, importStatementRegexp, 'utf8');
    try {
        const { stdout } = await execa(
            await getRgPath(),
            [
                '--no-config',
                // only output files
                '-l',
                // disable colors
                '--color',
                'never',
                '-f',
                patternFile,
                ...searchImportExts.flatMap((ext) => ['-g', `**/*.${ext}`]),
                ...excludePatterns.flatMap((p) => ['-g', p]),
                // searched folder is cwd
                cwd,
            ],
            { cwd },
        );

        return stdout
            .trim()
            .split('\n')
            .map((p) => resolve(cwd, p));
    } catch (error: any) {
        // when no matches, rg exit code is 1
        if (error.stderr) {
            console.error(error.escapedCommand);
            console.error(importStatementRegexp);
        }
        return [];
    } finally {
        await fs.unlink(patternFile);
    }
}
