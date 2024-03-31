import { debounce, throttle } from 'lodash-es';
import type {
    CancellationToken,
    CodeLens,
    CodeLensProvider,
    ConfigurationChangeEvent,
    Event,
    ExtensionContext,
    TextDocument,
} from 'vscode';
import { EventEmitter, window, workspace } from 'vscode';

export abstract class BaseCodeLensProvider implements CodeLensProvider {
    protected _document: TextDocument | undefined;

    // eslint-disable-next-line unicorn/prefer-event-target
    protected _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor(
        context: ExtensionContext,
        private getEnable: (document: TextDocument) => boolean | Promise<boolean>,
        private checkConfigChange: (event: ConfigurationChangeEvent) => boolean,
    ) {
        window.onDidChangeActiveTextEditor(
            (e) => {
                if (e?.document === this._document) {
                    this._reset();
                    this._onDidChangeCodeLenses.fire();
                }
            },
            null,
            context.subscriptions,
        );
        workspace.onDidChangeTextDocument(
            debounce(
                (e) => {
                    if (e.document === this._document) {
                        this._onDidChangeCodeLenses.fire();
                    }
                },
                500,
                {
                    leading: true,
                    trailing: true,
                },
            ),
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
            debounce(
                (e) => {
                    if (this.checkConfigChange(e)) {
                        this._reset();
                        this._onDidChangeCodeLenses.fire();
                    }
                },
                1000,
                {
                    leading: true,
                    trailing: true,
                },
            ),
            null,
            context.subscriptions,
        );
    }

    protected abstract _reset(document?: TextDocument): void;

    public abstract getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined>;

    private _throttledHandleProvideCodeLens = throttle(
        async (document: TextDocument, token: CancellationToken) => {
            this._document = document;

            if (!(await this.getEnable(document))) {
                return [];
            }

            return this.getCodeLenses(document, token);
        },
        50,
        {
            leading: true,
            trailing: true,
        },
    );

    public async provideCodeLenses(
        document: TextDocument,
        token: CancellationToken,
    ): Promise<CodeLens[]> {
        return (await this._throttledHandleProvideCodeLens(document, token)) ?? [];
    }
}
