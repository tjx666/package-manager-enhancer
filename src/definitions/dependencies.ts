import fs from 'node:fs/promises';
import { resolve } from 'node:path';

import type {
    CancellationToken,
    Definition,
    DefinitionLink,
    DefinitionProvider,
    Position,
    TextDocument,
} from 'vscode';
import { Uri } from 'vscode';

import { PACKAGE_JSON } from '../utils/constants';
import { getFileRange } from '../utils/editor';
import { jsoncStringNodeToRange } from '../utils/jsonc';
import { findPkgInstallDir, getPkgNameAndVersionFromDocPosition } from '../utils/pkg';

export class DependenciesDefinitionProvider implements DefinitionProvider {
    async provideDefinition(
        document: TextDocument,
        position: Position,
        _token: CancellationToken,
    ): Promise<Definition | DefinitionLink[] | undefined> {
        const pkgInfo = await getPkgNameAndVersionFromDocPosition(document, position);
        if (!pkgInfo) return;

        const installDir = await findPkgInstallDir(pkgInfo.name, document.uri.fsPath);
        if (!installDir) return;

        const pkgJsonPath = resolve(installDir, PACKAGE_JSON);
        const [targetUri, targetRange] = await Promise.all([
            fs.realpath(pkgJsonPath).then((p) => Uri.file(p)),
            getFileRange(pkgJsonPath),
        ]);
        const definition: DefinitionLink = {
            originSelectionRange: jsoncStringNodeToRange(document, pkgInfo.nameNode),
            targetUri,
            targetRange,
        };
        return [definition];
    }
}
