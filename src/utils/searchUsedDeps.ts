import validateNpmPackageName from 'validate-npm-package-name';

import { parseRgOutputLine, searchByRg } from './ripgrep';

const moduleCharactersWithoutDot = '\\w\\-@/';
const modulePath = `['"]([${moduleCharactersWithoutDot}]{1,2}[${moduleCharactersWithoutDot}.]*)['"]`;
const unnamedImport = `import\\s+${modulePath}`;
const esmUsage = `from\\s+${modulePath}`;
const commonjsUsage = `require\\s*\\(\\s*${modulePath}\\s*\\)`;
const depUsage = [unnamedImport, esmUsage, commonjsUsage].join('|');

// eslint-disable-next-line regexp/optimal-quantifier-concatenation
const modulePathRegexp = new RegExp(modulePath);

export async function searchUsedDeps(cwd: string) {
    const lines = await searchByRg(depUsage, cwd);
    const usedDeps = new Set<string>();
    lines.forEach((line) => {
        const { column, lineStr } = parseRgOutputLine(line)!;
        const [, modulePath] = lineStr.slice(column).match(modulePathRegexp)!;
        const isScopePackage = modulePath.startsWith('@');
        const firstSlash = modulePath.indexOf('/');
        let packageName: string;
        if (isScopePackage) {
            const secondSlash = modulePath.indexOf('/', firstSlash + 1);
            packageName = modulePath.slice(0, secondSlash === -1 ? undefined : secondSlash);
        } else {
            packageName = modulePath.slice(0, firstSlash === -1 ? undefined : firstSlash);
        }

        if (validateNpmPackageName(packageName).validForNewPackages) {
            usedDeps.add(packageName);
        }

        return undefined;
    });
    return [...usedDeps];
}
