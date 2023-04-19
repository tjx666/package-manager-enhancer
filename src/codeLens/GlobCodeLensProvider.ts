import type { CancellationToken, CodeLens, Position, TextDocument } from 'vscode';

import { BaseCodeLensProvider } from './BaseCodeLensProvider';

interface CodeLensDataItem {
    type: 'all' | 'include' | 'exclude';
    position: Position;
    getReferenceFilesPromise: Promise<string[]>;
}
type CodeLensData = Map<CodeLens, CodeLensDataItem>;

export abstract class GlobCodeLensProvider extends BaseCodeLensProvider {
    protected _codeLensData: CodeLensData = new Map();
    protected _negativePatterns: string[] = [];

    protected _reset(document?: TextDocument) {
        super._reset(document);
        this._negativePatterns = [];
        this._codeLensData.clear();
    }

    async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensData.get(codeLens);
        if (!data) return;

        const referencedFiles = await data.getReferenceFilesPromise;
        const packagesCount = referencedFiles.length;
        const title = (data.type === 'exclude' ? '- ' : '') + packagesCount;

        return {
            ...codeLens,
            command: {
                title,
                command: 'package-manager-enhancer.showReferencesInPanel',
                arguments: [this._document!.uri, data.position, referencedFiles],
                tooltip: 'click to open the files in references panel',
            },
        };
    }
}
