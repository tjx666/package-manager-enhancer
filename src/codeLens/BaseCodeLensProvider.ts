import throttle from 'lodash-es/throttle';
import { EventEmitter, workspace } from 'vscode';
import type {
    CancellationToken,
    CodeLensProvider,
    Event,
    CodeLens,
    TextDocument,
    ExtensionContext,
} from 'vscode';

const throttleWait = 500;

export abstract class BaseCodeLensProvider implements CodeLensProvider {
    protected _document: TextDocument | undefined;

    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor(context: ExtensionContext, private getEnable: (document: TextDocument) => boolean) {
        workspace.onDidChangeTextDocument(
            throttle((e) => {
                if (e.document === this._document) {
                    this._onDidChangeCodeLenses.fire();
                }
            }, throttleWait),
            null,
            context.subscriptions,
        );
        workspace.onDidCloseTextDocument(
            (document) => {
                if (document === this._document) {
                    this._reset();
                }
            },
            null,
            context.subscriptions,
        );
        workspace.onDidChangeConfiguration(
            throttle((_e) => {
                this._onDidChangeCodeLenses.fire();
            }, throttleWait),
            null,
            context.subscriptions,
        );
    }

    protected _reset(document?: TextDocument) {
        this._document = document;
    }

    public abstract getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined>;

    public async provideCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        this._reset(document);

        if (!this.getEnable(document)) {
            return [];
        }

        return this.getCodeLenses(document, _token);
    }
}
