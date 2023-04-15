import {parseTree} from 'jsonc-parser';

const tree = parseTree(JSON.stringify({
    main: './dist/index.js'
}))

console.log(tree);