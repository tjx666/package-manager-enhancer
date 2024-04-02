import fs from 'node:fs/promises';

import type { Node } from 'jsonc-parser';
import validatePkgName from 'validate-npm-package-name';
import {
    type CancellationToken,
    type Definition,
    type DefinitionLink,
    type DefinitionProvider,
    type Position,
    type TextDocument,
    Uri,
} from 'vscode';

import { getFileRange, jsoncStringNodeToRange } from '../utils/editor';
import { findPackagePath } from '../utils/pkg';

export class DependenciesDefinitionProvider implements DefinitionProvider {
    async provideDefinition(
        document: TextDocument,
        position: Position,
        _token: CancellationToken,
    ): Promise<Definition | DefinitionLink[] | undefined> {
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

        const node = jsoncParser.findNodeAtOffset(root, document.offsetAt(position));
        if (!node) return;

        const dependenciesNodes = dependenciesNodePath.map((path) =>
            jsoncParser.findNodeAtLocation(root, path.split('.')),
        );
        const isHoverOverDependency =
            node.type === 'string' &&
            node.parent?.type === 'property' &&
            node === node.parent.children?.[0] &&
            dependenciesNodes.includes(node.parent?.parent);
        if (!isHoverOverDependency) return;

        const pkgName = node.value;
        if (!validatePkgName(pkgName).validForOldPackages) return;

        const pkgJsonPath = await fs.realpath(document.uri.fsPath);
        const pkgPath = await findPackagePath(pkgName, pkgJsonPath);
        if (!pkgPath) return;

        const [targetUri, targetRange] = await Promise.all([
            fs.realpath(pkgPath.pkgJsonPath).then((p) => Uri.file(p)),
            getFileRange(pkgPath.pkgJsonPath),
        ]);
        const definition: DefinitionLink = {
            originSelectionRange: jsoncStringNodeToRange(document, node),
            targetUri,
            targetRange,
        };
        return [definition];
    }
}
