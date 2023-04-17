import { dirname } from 'node:path';

import type { Node } from 'jsonc-parser';
import type { CancellationToken, ExtensionContext, Position, TextDocument } from 'vscode';
import { CodeLens, window, Range } from 'vscode';

import { BaseCodeLensProvider } from './BaseCodeLensProvider';
import { configuration } from '../configuration';
import { searchImportDepFiles } from '../utils/rg';

interface Dependency {
    name: string;
    range: Range;
}

export class PackageJsonDependenciesCodeLensProvider extends BaseCodeLensProvider {
    private _codeLensData: Map<
        CodeLens,
        {
            depName: string;
            position: Position;
        }
    > = new Map();

    constructor(context: ExtensionContext) {
        super(context, () => configuration.enablePackageJsonDependenciesCodeLens);
    }

    protected _reset(document?: TextDocument) {
        super._reset(document);
        this._codeLensData.clear();
    }

    async getDependencies(root: Node, path: string[]) {
        const { findNodeAtLocation } = await import('jsonc-parser');
        const dependencies: Dependency[] = [];
        const dependenciesNode = findNodeAtLocation(root, path);
        if (
            !dependenciesNode ||
            dependenciesNode.type !== 'object' ||
            !dependenciesNode.children ||
            dependenciesNode.children.length === 0
        )
            return dependencies;

        for (const depEntryNode of dependenciesNode.children) {
            if (!depEntryNode.children) return [];
            const depNameNode = depEntryNode.children[0];
            if (depNameNode.type !== 'string') return [];

            const start = this._document!.positionAt(depNameNode.offset);
            const end = this._document!.positionAt(depNameNode.offset + depNameNode.length - 2);
            dependencies.push({
                name: depNameNode.value,
                range: new Range(start, end),
            });
        }

        return dependencies;
    }

    async getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        const filePath = document.uri.fsPath;
        const packageJson = document.getText();
        const { parseTree } = await import('jsonc-parser');
        let root: Node | undefined;
        try {
            root = parseTree(packageJson);
        } catch (error) {
            console.error(error);
            window.showErrorMessage(`parse ${filePath} failed!`);
        }
        if (!root) return [];

        const dependencies: Dependency[] = (
            await Promise.all(
                configuration.packageJsonDependenciesCodeLens.dependenciesNodePaths.map(
                    (nodePath) => this.getDependencies(root!, nodePath.split('.')),
                ),
            )
        ).flat();

        return dependencies.map((dep) => {
            const codeLens = new CodeLens(dep.range);
            this._codeLensData.set(codeLens, {
                depName: dep.name,
                position: dep.range.start,
            });
            return codeLens;
        });
    }

    async resolveCodeLens?(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensData.get(codeLens);
        if (!data) return;

        const usedFiles = await searchImportDepFiles(
            data.depName,
            dirname(this._document!.uri.fsPath),
        );
        return {
            ...codeLens,
            command: {
                title: String(usedFiles.length),
                command: 'package-manager-enhancer.showReferencesInPanel',
                arguments: [this._document!.uri, data.position, usedFiles],
            },
        };
    }
}
