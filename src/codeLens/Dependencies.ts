import { dirname } from 'node:path';

import type { Node } from 'jsonc-parser';
import type { CancellationToken, CodeLensProvider, Event, Position, TextDocument } from 'vscode';
import { CodeLens, EventEmitter, workspace, window, Range } from 'vscode';

import { searchImportDepFiles } from '../utils/rg';

// const dependenciesPathList = [
//     'dependencies',
//     'devDependencies',
//     'peerDependencies',
//     'optionalDependencies',
//     'pnpm.overrides',
// ];

export class DependenciesCodeLens implements CodeLensProvider {
    private _document: TextDocument | undefined;
    private _codeLensData: Map<
        CodeLens,
        {
            depName: string;
            position: Position;
        }
    > = new Map();

    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        workspace.onDidChangeTextDocument((e) => {
            if (e.document === this._document) {
                this._onDidChangeCodeLenses.fire();
            }
        });
        workspace.onDidCloseTextDocument((document) => {
            if (document === this._document) {
                this._reset();
            }
        });
    }

    private _reset(document?: TextDocument) {
        this._document = document;
        this._codeLensData.clear();
    }

    async getDependencies(root: Node, path: string[]) {
        const { findNodeAtLocation } = await import('jsonc-parser');
        const dependencies: Array<{
            name: string;
            range: Range;
        }> = [];
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

    async provideCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        this._reset(document);

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

        const dependencies = await this.getDependencies(root, ['dependencies']);
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
