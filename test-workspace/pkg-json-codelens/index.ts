import { globby } from 'globby';
import lodash from 'lodash';

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
