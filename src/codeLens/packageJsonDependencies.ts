import { dirname } from 'node:path';

import type { Node } from 'jsonc-parser';
import micromatch from 'micromatch';
import type { CancellationToken, ExtensionContext, Position, TextDocument } from 'vscode';
import { workspace, CodeLens, window, Range } from 'vscode';

import { BaseCodeLensProvider } from './BaseCodeLensProvider';
import { configuration } from '../configuration';
import type { SearchImportsMatch } from '../utils/searchImports';
import { searchImportDepFiles } from '../utils/searchImports';

interface Dependency {
    name: string;
    range: Range;
}

export class PackageJsonDependenciesCodeLensProvider extends BaseCodeLensProvider {
    private _codeLensData: Map<
        CodeLens,
        {
            type: 'imports' | 'type imports';
            depName: string;
            position: Position;
            searchImportsPromise: Promise<SearchImportsMatch[]>;
        }
    > = new Map();

    constructor(context: ExtensionContext) {
        super(context, (document: TextDocument) => {
            const isIgnored = () => {
                if (configuration.packageJsonDependenciesCodeLens.ignorePatterns.length === 0)
                    return false;
                return (
                    micromatch(
                        [document.uri.fsPath],
                        configuration.packageJsonDependenciesCodeLens.ignorePatterns,
                        {
                            cwd: workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
                        },
                    ).length === 0
                );
            };

            return configuration.enablePackageJsonDependenciesCodeLens && !isIgnored();
        });
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
            const importsCodeLens = new CodeLens(dep.range);
            const searchImportsPromise = searchImportDepFiles(
                dep.name,
                dirname(this._document!.uri.fsPath),
            );
            this._codeLensData.set(importsCodeLens, {
                type: 'imports',
                depName: dep.name,
                position: dep.range.start,
                searchImportsPromise,
            });

            return importsCodeLens;
        });
    }

    async resolveCodeLens?(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensData.get(codeLens);
        if (!data) return;

        const matches = await data.searchImportsPromise;
        const typeImportsCount = matches.filter((match) => match.isTypeImport).length;
        const count = matches.length;
        let title: string;
        let command: string;
        let tooltip: string;
        let args: any[];
        if (count === 0) {
            title = 'unused';
            tooltip = 'click to remove this dependency';
            command = 'package-manager-enhancer.removeUnusedDependency';
            args = [data.position.line];
        } else {
            const isOnlyTypeImports = count === typeImportsCount;
            title = `${count} ${isOnlyTypeImports ? 'type imports' : 'imports'}`;
            tooltip = `click to open the ${data.type} in references panel`;
            command = 'package-manager-enhancer.showReferencesInPanel';
            args = [this._document!.uri, data.position, matches];
        }

        return {
            ...codeLens,
            command: {
                title,
                command,
                arguments: args,
                tooltip,
            },
        };
    }
}
