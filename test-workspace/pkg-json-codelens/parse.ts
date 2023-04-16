import {parseTree} from 'jsonc-parser';

const tree = parseTree(JSON.stringify({
    dependencies: {
        lodash: "1.17.14",
        axios: "1.2.4"
    }
}))

console.log(tree);