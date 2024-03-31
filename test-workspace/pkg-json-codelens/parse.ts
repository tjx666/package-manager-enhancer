import { parseTree } from 'jsonc-parser';

const tree = parseTree(
    JSON.stringify({
        packageManager: 'pnpm@8.15.5',
        dependencies: {
            lodash: '1.17.14',
            axios: '1.2.4',
        },
    }),
);

console.log(tree);
