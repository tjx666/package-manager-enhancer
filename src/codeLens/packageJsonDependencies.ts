import { dirname } from 'node:path';

import type { Node } from 'jsonc-parser';
import type { CancellationToken, ExtensionContext, Position, TextDocument } from 'vscode';
import { CodeLens, window, Range } from 'vscode';

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
            searchAllImportsPromise: Promise<SearchImportsMatch[]>;
            searchImportsPromise: Promise<SearchImportsMatch[]>;
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

        return dependencies.flatMap((dep) => {
            const importsCodeLens = new CodeLens(dep.range);
            const searchAllImportsPromise = searchImportDepFiles(
                dep.name,
                dirname(this._document!.uri.fsPath),
            );
            this._codeLensData.set(importsCodeLens, {
                type: 'imports',
                depName: dep.name,
                position: dep.range.start,
                searchAllImportsPromise,
                searchImportsPromise: (async function () {
                    const matches = await searchAllImportsPromise;
                    return matches.filter((match) => !match.isTypeImport);
                })(),
            });

            const typeImportsCodeLens = new CodeLens(dep.range);
            this._codeLensData.set(typeImportsCodeLens, {
                type: 'type imports',
                depName: dep.name,
                position: dep.range.start,
                searchAllImportsPromise,
                searchImportsPromise: (async function () {
                    const matches = await searchAllImportsPromise;
                    return matches.filter((match) => match.isTypeImport);
                })(),
            });

            return [importsCodeLens, typeImportsCodeLens];
        });
    }

    async resolveCodeLens?(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensData.get(codeLens);
        if (!data) return;

        const matches = await data.searchImportsPromise;
        const count = matches.length;
        const title = `${String(count)} ${data.type}`;

        let command: string;
        let tooltip: string;
        let args: any[];
        if (count === 0) {
            tooltip = 'click to remove this dependency';
            command = 'package-manager-enhancer.deleteLine';
            args = [data.position.line];
        } else {
            command = 'package-manager-enhancer.showReferencesInPanel';
            tooltip = `click to open the ${data.type} in references panel`;
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
