import {glob} from 'glob';

glob(['src/**', ... [
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
].map((p) => `!${p}`)], {
    
    dotRelative: true,
    matchBase: true,
    cwd: '/Users/yutengjing/code/package-manager-enhancer/test-workspace',
    dot: true,
    ignore: ['**/.npmignore']
}).then(files => {
    console.log(files);
})