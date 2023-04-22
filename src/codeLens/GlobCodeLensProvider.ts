import type { CancellationToken, CodeLens, Position, TextDocument } from 'vscode';

import { BaseCodeLensProvider } from './BaseCodeLensProvider';
import { commands } from '../utils/constants';

interface CodeLensData {
    type: 'all' | 'include' | 'exclude';
    position: Position;
    getReferenceFilesPromise: Promise<string[]>;
}

export abstract class GlobCodeLensProvider extends BaseCodeLensProvider {
    protected _codeLensDataMap: Map<CodeLens, CodeLensData> = new Map();
    protected _negativePatterns: string[] = [];

    protected _reset() {
        this._negativePatterns = [];
        this._codeLensDataMap.clear();
    }

    async getCodeLenses(
        _document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        this._reset();
        return [];
    }

    abstract getTitleFormat(): string;

    async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensDataMap.get(codeLens);
        if (!data) return;

        const referencedFiles = await data.getReferenceFilesPromise;
        const count = referencedFiles.length;
        const signedCount = (data.type === 'exclude' ? -1 : 1) * count;
        const title = this.getTitleFormat()
            // eslint-disable-next-line no-template-curly-in-string
            .replaceAll('${signedCount}', String(signedCount))
            // eslint-disable-next-line no-template-curly-in-string
            .replaceAll('${count}', String(count));

        codeLens.command = {
            title,
            command: commands.showReferencesInPanel,
            arguments: [this._document!.uri, data.position, referencedFiles],
            tooltip: 'click to open the files in references panel',
        };
        return codeLens;
    }
}
