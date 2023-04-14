import { dirname, resolve } from 'node:path';

import { globby } from 'globby';
import type { Node } from 'jsonc-parser';
import { parseTree, findNodeAtLocation } from 'jsonc-parser';
import type { CancellationToken, CodeLensProvider, TextDocument, Event } from 'vscode';
import { EventEmitter, workspace, window, Range, CodeLens } from 'vscode';

import { resolveReferencesCodeLens, type CodeLensData } from './utils';

const filesLiteral = 'files';

export class PackageJsonCodeLensProvider implements CodeLensProvider {
    private _document: TextDocument | undefined;
    private _codeLensData: CodeLensData = new Map();
    private _negativePatterns: string[] = [];

    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        workspace.onDidChangeTextDocument((e) => {
            if (e.document === this._document) {
                this._onDidChangeCodeLenses.fire();
            }
        });
    }

    private _reset(document: TextDocument) {
        this._document = document;
        this._negativePatterns = [];
        this._codeLensData.clear();
    }

    async provideCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        this._reset(document);

        const filePath = document.uri.fsPath;
        const packageJson = document.getText();
        let root: Node | undefined;
        try {
            root = parseTree(packageJson);
        } catch (error) {
            console.error(error);
            window.showErrorMessage(`parse ${filePath} failed!`);
            return;
        }

        if (!root) return;
        const filesPropertyNode = findNodeAtLocation(root, ['files']);
        if (
            !filesPropertyNode ||
            !filesPropertyNode.children ||
            filesPropertyNode.children.length === 0
        )
            return;

        const patternList: Array<{
            isNegated: boolean;
            pattern: string;
            range: Range;
        }> = [];
        for (const patternNode of filesPropertyNode.children) {
            if (patternNode.type !== 'string') return;

            const pattern = patternNode.value as string;
            const start = document.positionAt(patternNode.offset);
            const end = document.positionAt(patternNode.offset + patternNode.length - 2);
            const range = new Range(start, end);
            const isNegated = pattern.startsWith('!');
            if (isNegated) {
                this._negativePatterns.push(pattern);
            }
            patternList.push({
                isNegated,
                pattern,
                range,
            });
        }

        const totalFiles: Set<string> = new Set();
        const codeLensList: CodeLens[] = [];
        const promises: Array<Promise<string[]>> = [];
        const cwd = dirname(filePath);
        for (const item of patternList) {
            const codeLens = new CodeLens(item.range);
            codeLensList.push(codeLens);

            const patterns = item.isNegated
                ? [item.pattern.slice(1)]
                : [item.pattern, ...this._negativePatterns];
            const promise = (async () => {
                const relativeFiles = await globby(patterns, { cwd });
                return relativeFiles.map((file) => {
                    const absFile = resolve(cwd, file);
                    if (!item.isNegated) {
                        totalFiles.add(absFile);
                    }
                    return absFile;
                });
            })();
            if (!item.isNegated) {
                promises.push(promise);
            }
            this._codeLensData.set(codeLens, {
                type: item.isNegated ? 'exclude' : 'include',
                position: item.range.start,
                getReferenceFilesPromise: promise,
            });
        }

        const start = document.positionAt(filesPropertyNode.offset);
        const end = document.positionAt(filesPropertyNode.offset + filesLiteral.length);
        const codelens = new CodeLens(new Range(start, end));
        codeLensList.push(codelens);
        this._codeLensData.set(codelens, {
            type: 'all',
            position: start,
            getReferenceFilesPromise: (async () => {
                await Promise.all(promises);
                return [...totalFiles];
            })(),
        });

        return codeLensList;
    }

    async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        return resolveReferencesCodeLens(codeLens, this._codeLensData, this._document!);
    }
}
