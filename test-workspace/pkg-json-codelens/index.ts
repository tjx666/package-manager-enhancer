import { globby } from 'globby';
import lodash from 'lodash-es';
import 'lodash/add';
import type { x} from 'bbb';
import { EventEmitter, workspace } from 'vscode';
import type {
    CancellationToken,
    CodeLensProvider,
    Event,
    CodeLens,
    TextDocument,
    ExtensionContext,
} from 'vscode';
import * as 
e from 'execa'
import {resolve} from 'path'


console.log(lodash);

globby(
    [
        'src',
        ...[
            'node_modules',
            'npm-debug.log',
            'package-lock.json',
            '**/.gitignore',
            '**/.npmignore',
            '**/.git',
            '**/CVS',
            '**/.svn',
            '**/.hg',
            '**/.lock-wscript',
            '**/.wafpickle-N',
            '**/.*.swp',
            '**/.DS_Store',
            '**/._*',
            '**/.npmrc',
            '**/config.gypi',
            '**/*.orig',
        ].map((p) => `!${p}`),
    ],
    {
        cwd: '/Users/yutengjing/code/package-manager-enhancer/test-workspace',
        dot: true,
        ignoreFiles: ['**/.npmignore'],
    },
).then((files) => {
    console.log(files);
});
