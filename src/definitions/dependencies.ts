import fs from 'node:fs/promises';

import {
    type CancellationToken,
    type Definition,
    type DefinitionLink,
    type DefinitionProvider,
    type Position,
    type TextDocument,
    Uri,
} from 'vscode';

import { getFileRange } from '../utils/editor';
import { jsoncStringNodeToRange } from '../utils/jsonc';
import { findPackagePath, getPkgNameAndVersionFromDocPosition } from '../utils/pkg';

export class DependenciesDefinitionProvider implements DefinitionProvider {
    async provideDefinition(
        document: TextDocument,
        position: Position,
        _token: CancellationToken,
    ): Promise<Definition | DefinitionLink[] | undefined> {
        const pkgInfo = await getPkgNameAndVersionFromDocPosition(document, position);
        if (!pkgInfo) return;

        const pkgPath = await findPackagePath(pkgInfo.name, document.uri.fsPath);
        if (!pkgPath) return;

        const [targetUri, targetRange] = await Promise.all([
            fs.realpath(pkgPath.pkgJsonPath).then((p) => Uri.file(p)),
            getFileRange(pkgPath.pkgJsonPath),
        ]);
        const definition: DefinitionLink = {
            originSelectionRange: jsoncStringNodeToRange(document, pkgInfo.nameNode),
            targetUri,
            targetRange,
        };
        return [definition];
    }
}
