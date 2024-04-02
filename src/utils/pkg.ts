import { dirname, resolve } from 'node:path';

import { isFile, pathExists } from './fs';
import { getRootOfPath, trimRightSlash } from './path';

export async function findPackagePath(packageName: string, startPath: string, endPath?: string) {
    if (endPath === undefined) {
        endPath = await getRootOfPath(startPath);
    }

    startPath = trimRightSlash(startPath);
    endPath = trimRightSlash(endPath);
    if (await isFile(startPath)) {
        startPath = dirname(startPath);
    }
    let currentDirPath = startPath;
    let end = false;
    let pkgDir = '';

    do {
        pkgDir = resolve(currentDirPath, 'node_modules', packageName);
        const pkgJsonPath = resolve(pkgDir, 'package.json');
        // eslint-disable-next-line no-await-in-loop
        if ((await Promise.all([pathExists(pkgDir), pathExists(pkgJsonPath)])).every(Boolean)) {
            return {
                pkgDir,
                pkgJsonPath,
            };
        }
        end = currentDirPath === endPath;
        currentDirPath = dirname(currentDirPath);
    } while (!end);

    return undefined;
}
