import { EventEmitter, workspace } from 'vscode';
import type {
    CancellationToken,
    CodeLensProvider,
    Event,
    ProviderResult,
    CodeLens,
    Position,
    TextDocument,
} from 'vscode';

interface CodeLensDataItem {
    type: 'all' | 'include' | 'exclude';
    position: Position;
    getReferenceFilesPromise: Promise<string[]>;
}
type CodeLensData = Map<CodeLens, CodeLensDataItem>;

export abstract class GlobCodeLensProvider implements CodeLensProvider {
    protected _document: TextDocument | undefined;
    protected _codeLensData: CodeLensData = new Map();
    protected _negativePatterns: string[] = [];

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

    protected _reset(document?: TextDocument) {
        this._document = document;
        this._negativePatterns = [];
        this._codeLensData.clear();
    }

    provideCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): ProviderResult<CodeLens[]> {
        this._reset(document);
        return [];
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
            },
        };
    }
}
