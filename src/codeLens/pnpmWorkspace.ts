import path, { dirname } from 'node:path';

import type { CancellationToken, ExtensionContext, TextDocument } from 'vscode';
import { window, CodeLens, Range } from 'vscode';

import { GlobCodeLensProvider } from './GlobCodeLensProvider';
import { configuration } from '../configuration';

const packagesLiteral = 'packages';
const defaultIgnoredPatterns = ['!**/node_modules'];

function sourceToString(source: string) {
    if (
        (source[0] === "'" && source.at(-1) === "'") ||
        (source[0] === '"' && source.at(-1) === '"')
    )
        return source.slice(1, -1);
    else return source;
}

export class PnpmWorkspaceCodeLensProvider extends GlobCodeLensProvider {
    constructor(context: ExtensionContext) {
        super(context, () => configuration.enablePnpmWorkspaceCodeLens);
    }

    async getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        // lazy import to improve startup speed
        const { globby } = await import('globby');
        const { Parser } = await import('yaml');

        const cwd = dirname(document.uri.fsPath);
        const source = document.getText();
        let yamlDoc: any | undefined;
        const parser = new Parser();
        try {
            for (const token of parser.parse(source)) {
                if (token.type === 'document') {
                    yamlDoc = token;
                    break;
                }
            }
        } catch (error) {
            console.error(error);
            window.showErrorMessage('parse pnpm-workspace.yaml failed!');
            return;
        }
        if (!yamlDoc) return;

        const packagesNode = yamlDoc.value?.items.find(
            (token: any) => token.key?.source === packagesLiteral,
        ) as any | undefined;
        if (!packagesNode) return;

        const patternList: Array<{
            isNegated: boolean;
            range: Range;
            pattern: string;
        }> = [];
        for (const globNode of packagesNode.value.items) {
            if (globNode.value.type !== 'single-quoted-scalar') continue;

            const glob = sourceToString(globNode.value.source);
            if (glob.startsWith('!')) {
                this._negativePatterns.push(glob);
            }

            const start = document.positionAt(globNode.value!.offset);
            const end = document.positionAt(globNode.value!.offset + glob.length);
            patternList.push({
                isNegated: glob.startsWith('!'),
                range: new Range(start, end),
                pattern: glob,
            });
        }

        const codeLensList: CodeLens[] = [];
        const totalPackages = new Set<string>([]);
        const promises: Array<Promise<string[]>> = [];
        for (const item of patternList.values()) {
            const codeLens = new CodeLens(item.range);
            codeLensList.push(codeLens);
            const getPackagesPromise = (async () => {
                let matchedPackages: string[] = [];
                let patterns: string[];
                if (!item.isNegated) {
                    const slash = item.pattern.endsWith('/') ? '' : '/';
                    const packageJSONGlob = `${item.pattern}${slash}package.json`;
                    patterns = [
                        packageJSONGlob,
                        ...this._negativePatterns,
                        ...defaultIgnoredPatterns,
                    ];
                } else {
                    const pattern = item.pattern.slice(1);
                    const slash = pattern.endsWith('/') ? '' : '/';
                    const packageJSONGlob = `${pattern}${slash}package.json`;
                    patterns = [packageJSONGlob, ...defaultIgnoredPatterns];
                }
                matchedPackages = await globby(patterns, { cwd });
                return matchedPackages.map((pkg) => {
                    const absPath = path.resolve(cwd, pkg);
                    if (!item.isNegated) {
                        totalPackages.add(absPath);
                    }
                    return absPath;
                });
            })();
            if (!item.isNegated) {
                promises.push(getPackagesPromise);
            }
            this._codeLensData.set(codeLens, {
                type: item.isNegated ? 'exclude' : 'include',
                position: item.range.start,
                getReferenceFilesPromise: getPackagesPromise,
            });
        }

        const start = document.positionAt(packagesNode.key!.offset);
        const end = document.positionAt(packagesNode.key!.offset + packagesLiteral.length);
        const codeLens = new CodeLens(new Range(start, end));
        codeLensList.push(codeLens);
        this._codeLensData.set(codeLens, {
            type: 'all',
            position: start,
            getReferenceFilesPromise: (async () => {
                await Promise.all(promises);
                return [...totalPackages];
            })(),
        });
        return codeLensList;
    }
}
