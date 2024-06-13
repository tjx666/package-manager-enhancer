import { memoize } from 'lodash-es';
import validateNpmPackageName from 'validate-npm-package-name';

import { parseRgOutputLine, searchByRg } from './ripgrep';

const moduleCharactersWithoutDot = String.raw`\w\-@/`;
// exclude relative module
const modulePath = `['"][${moduleCharactersWithoutDot}]{1,2}[${moduleCharactersWithoutDot}.]*['"]`;
const unnamedImport = `import\\s*${modulePath}`;
const dynamicImport = `import\\s*\\(${modulePath}\\)`;
const namedImport = `from\\s+${modulePath}`;
const requireCall = `require\\s*\\(\\s*${modulePath}\\s*\\)`;
const depUsage = [unnamedImport, dynamicImport, namedImport, requireCall].join('|');

// eslint-disable-next-line regexp/optimal-quantifier-concatenation
const modulePathWithCapture = `['"]([${moduleCharactersWithoutDot}]{1,2}[${moduleCharactersWithoutDot}.]*)['"]`;
const modulePathRegexp = new RegExp(modulePathWithCapture);

function _parseDepFromLine(line: string) {
    const { column, lineStr } = parseRgOutputLine(line)!;
    const matchArray = lineStr.slice(column).match(modulePathRegexp);
    if (!matchArray) return undefined;

    const [, modulePath] = matchArray;
    const isScopePackage = modulePath.startsWith('@');
    const firstSlash = modulePath.indexOf('/');
    let packageName: string;
    if (isScopePackage) {
        const secondSlash = modulePath.indexOf('/', firstSlash + 1);
        packageName = modulePath.slice(0, secondSlash === -1 ? undefined : secondSlash);
    } else {
        packageName = modulePath.slice(0, firstSlash === -1 ? undefined : firstSlash);
    }

    // exclude node builtin packages and other none legal package name
    if (validateNpmPackageName(packageName).validForNewPackages) {
        return packageName;
    }

    return undefined;
}
const parseDepFromLine = memoize(_parseDepFromLine);

export async function searchUsedDeps(cwd: string) {
    const lines = await searchByRg(depUsage, cwd);
    const usedDeps = new Set<string>();
    lines.forEach((line) => {
        const packageName = parseDepFromLine(line);
        if (packageName) {
            usedDeps.add(packageName);
        }
    });
    return [...usedDeps];
}
