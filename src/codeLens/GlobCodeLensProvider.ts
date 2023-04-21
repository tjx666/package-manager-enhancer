import type { CancellationToken, CodeLens, Position, TextDocument } from 'vscode';

import { BaseCodeLensProvider } from './BaseCodeLensProvider';

interface CodeLensData {
    type: 'all' | 'include' | 'exclude';
    position: Position;
    getReferenceFilesPromise: Promise<string[]>;
}

export abstract class GlobCodeLensProvider extends BaseCodeLensProvider {
    protected _codeLensDataMap: Map<CodeLens, CodeLensData> = new Map();
    protected _negativePatterns: string[] = [];

    protected _reset(document?: TextDocument) {
        super._reset(document);
        this._negativePatterns = [];
        this._codeLensDataMap.clear();
    }

    async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensDataMap.get(codeLens);
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
