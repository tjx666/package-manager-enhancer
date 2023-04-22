import throttle from 'lodash-es/throttle';
import { EventEmitter, workspace, window } from 'vscode';
import type {
    CancellationToken,
    CodeLensProvider,
    Event,
    CodeLens,
    TextDocument,
    ExtensionContext,
} from 'vscode';

export abstract class BaseCodeLensProvider implements CodeLensProvider {
    protected _document: TextDocument | undefined;

    protected _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor(
        context: ExtensionContext,
        private getEnable: (document: TextDocument) => boolean | Promise<boolean>,
    ) {
        window.onDidChangeActiveTextEditor((e) => {
            if (e?.document === this._document) {
                this._reset();
                this._onDidChangeCodeLenses.fire();
            }
        });
        workspace.onDidChangeTextDocument(
            (e) => {
                if (e.document === this._document) {
                    this._onDidChangeCodeLenses.fire();
                }
            },
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
            (_e) => {
                this._reset();
                this._onDidChangeCodeLenses.fire();
            },
            null,
            context.subscriptions,
        );
    }

    protected abstract _reset(document?: TextDocument): void;

    public abstract getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined>;

    private _throttleHandleProvideCodeLens = throttle(
        async (document: TextDocument, token: CancellationToken) => {
            this._document = document;

            if (!(await this.getEnable(document))) {
                return [];
            }

            return this.getCodeLenses(document, token);
        },
        100,
    );

    public async provideCodeLenses(
        document: TextDocument,
        token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        return this._throttleHandleProvideCodeLens(document, token);
    }
}
