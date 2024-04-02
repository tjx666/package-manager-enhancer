import { dirname, resolve } from 'node:path';

import { execa } from 'execa';
import type { Node } from 'jsonc-parser';
import type { JsonValue } from 'type-fest';
import validatePkgName from 'validate-npm-package-name';
import type { Position, TextDocument } from 'vscode';

import { NODE_MODULES } from './constants';
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
        pkgDir = resolve(currentDirPath, NODE_MODULES, packageName);
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

export async function getPkgNameAndVersionFromDocPosition(
    document: TextDocument,
    position: Position,
) {
    const jsoncParser = await import('jsonc-parser');

    const pkgJson = document.getText();
    let root: Node | undefined;
    try {
        root = jsoncParser.parseTree(pkgJson);
    } catch {
        return;
    }
    if (!root) return;

    const dependenciesNodePath = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ];

    const nameNode = jsoncParser.findNodeAtOffset(root, document.offsetAt(position));
    if (!nameNode || !nameNode.parent) return;

    const dependenciesNodes = dependenciesNodePath.map((path) =>
        jsoncParser.findNodeAtLocation(root, path.split('.')),
    );

    const versionNode = nameNode.parent.children![1];
    const isHoverOverDependency =
        nameNode.type === 'string' &&
        versionNode.type === 'string' &&
        nameNode.parent?.type === 'property' &&
        nameNode.parent.children?.length === 2 &&
        nameNode === nameNode.parent.children![0] &&
        dependenciesNodes.includes(nameNode.parent?.parent);
    if (!isHoverOverDependency) return;

    const pkgName = nameNode.value;
    if (!validatePkgName(pkgName).validForOldPackages) return;

    return {
        nameNode,
        versionNode,
        name: pkgName,
        version: versionNode.value!,
    };
}

/**
 * Ref: [vscode builtin npm extension npmView
 * implementation](https://github.com/microsoft/vscode/blob/main/extensions/npm/src/features/packageJSONContribution.ts#L285)
 */
export async function getPackageInfoFromNpmView<
    V extends JsonValue,
    const PA extends readonly string[] = readonly string[],
>(
    packageName: string,
    properties: PA,
    cwd: string,
): Promise<
    | (PA['length'] extends 1
          ? V
          : {
                [K in PA[number]]: V;
            })
    | undefined
> {
    try {
        const { stdout } = await execa('npm', ['view', '--json', packageName, ...properties], {
            cwd,
        });
        return JSON.parse(stdout);
    } catch {
        return undefined;
    }
}
