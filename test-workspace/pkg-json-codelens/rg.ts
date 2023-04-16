import { execa } from 'execa';

const { stdout, command, escapedCommand } = await execa(
    '/usr/local/bin/rg',
    [
        // suppress error messages
        '--no-messages',
        // disable colors
        '--color',
        'never',
        '--no-config',
        // only output files
        '-l',
        'import',
        '.',
    ],
    {
        timeout: 3000,
        cwd: '/Users/yutengjing/code/package-manager-enhancer/test-workspace/pkg-json-codelens',
    },
);

console.log(command);
console.log(escapedCommand);
console.log(stdout);
