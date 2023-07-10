import escape from 'escape-string-regexp';

import { searchByRg } from './ripgrep';

function getImportStatementRegexp(dep: string) {
    const escapedDepName = escape(dep);
    // import(/* webpackChunkName: "heic2any" */ 'heic2any');
    const magicComment = `(/\\*\\s*webpackChunkName:\\s*['"][a-zA-Z\\d\\-_.]+['"]\\s*\\*/)`;
    const modulePath = `${magicComment}?\\s*['"]${escapedDepName}(/[a-zA-Z\\d\\-_.]+)*(\\?\\S*)?['"]`;
    // require ( 'lodash'   )
    const requireRegexp = `require\\s*\\(\\s*${modulePath}\\s*\\)\\s*;?`;
    // import { add } from 'lodash';
    const importRegexp = `import\\s+(type\\s+)?[$_a-zA-Z\\*\\d,\{\\\\}\\s]+\\s+from\\s+${modulePath}\\s*;?`;
    // import 'core-js/stable'
    const unassignedImportRegexp = `import\\s+${modulePath};?`;
    // await import ('lodash')
    // const dynamicImportRegexp = `import\\s+(type\\s+)?\\s*\\(${modulePath}\\)\\s*;?`;
    const dynamicImportRegexp = `import\\s*\\(${modulePath}\\)\\s*;?`;
    return [requireRegexp, importRegexp, unassignedImportRegexp, dynamicImportRegexp].join('|');
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

const lineRegexp = /^(?<absPath>.*):(?<line>\d+):(?<column>\d+):(?<lineStr>.*)/;
function parseSearchResultLine(
    line: string,
    importRegexpStr: string,
    searchedDep: string,
): SearchImportsMatch | undefined {
    const matchArray = line.match(lineRegexp);
    if (matchArray && matchArray.groups) {
        const { groups } = matchArray;
        const { absPath, lineStr } = groups;
        const line = Number.parseInt(groups.line, 10) - 1;
        const column = Number.parseInt(groups.column, 10) - 1;
        const importRegexp = new RegExp(`^${importRegexpStr}`);
        const lineSource = lineStr.slice(column);
        const importStatementMatch = lineSource.match(importRegexp);
        const importStatement = importStatementMatch ? importStatementMatch[0] : lineSource;
        return {
            searchedDep,
            absPath,
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
export async function searchImportDepFiles(dep: string, cwd: string) {
    // @types/xxx should find xxx
    if (dep.startsWith(atTypesLiteral)) {
        dep = dep.slice(atTypesLiteral.length + 1);
    }
    const importStatementRegexp = getImportStatementRegexp(dep);
    const lines = await searchByRg(importStatementRegexp, cwd, { heavy: true });
    return lines
        .map((line) => parseSearchResultLine(line, importStatementRegexp, dep))
        .filter(Boolean) as SearchImportsMatch[];
}
