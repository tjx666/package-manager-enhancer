import escape from 'escape-string-regexp';

import { parseRgOutputLine, searchByRg } from './ripgrep';

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

function parseLine(
    outputLine: string,
    importRegexpStr: string,
    searchedDep: string,
): SearchImportsMatch | undefined {
    const { absPath, line, column, lineStr } = parseRgOutputLine(outputLine);
    // FIXME: cache
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

const atTypesLiteral = '@types';
export async function searchImports(dep: string, cwd: string) {
    // @types/xxx should find xxx
    if (dep.startsWith(atTypesLiteral)) {
        dep = dep.slice(atTypesLiteral.length + 1);
    }
    const importStatementRegexp = getImportStatementRegexp(dep);
    const lines = await searchByRg(importStatementRegexp, cwd, { heavy: true });
    return lines
        .map((line) => parseLine(line, importStatementRegexp, dep))
        .filter(Boolean) as SearchImportsMatch[];
}
