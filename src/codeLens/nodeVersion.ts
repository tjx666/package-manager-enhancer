import type { CancellationToken, ExtensionContext, TextDocument } from 'vscode';
import { CodeLens, Range } from 'vscode';

import type { NodeVersions } from '../apis';
import { fetchNodeVersions, tryFetch } from '../apis';
import { configuration, configurationKeys } from '../configuration';
import { commands } from '../utils/constants';
import { BaseCodeLensProvider } from './BaseCodeLensProvider';

export class NodeVersionCodeLensProvider extends BaseCodeLensProvider {
    private _codelensData:
        | {
              version: string;
              fetchNodeVersionsPromise: Promise<NodeVersions>;
          }
        | undefined;

    constructor(context: ExtensionContext) {
        super(
            context,
            () => configuration.enableNodeVersionCodeLens,
            (e) => e.affectsConfiguration(configurationKeys.enableNodeVersionCodeLens),
        );
    }

    protected _reset(_document?: TextDocument | undefined): void {
        // ...
    }

    public async getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        const content = document.getText();
        const match = content.match(/v?(\d+(\.\d+)?(\.\d+)?)/);
        if (!match) return [];

        const version = match[1];
        this._codelensData = {
            version,
            fetchNodeVersionsPromise: tryFetch(fetchNodeVersions(version)),
        };
        return [
            new CodeLens(
                new Range(
                    document.positionAt(match.index!),
                    document.positionAt(match.index! + match[0].length),
                ),
            ),
        ];
    }

    public async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codelensData!;
        const nodeVersions = await data.fetchNodeVersionsPromise;
        if (!nodeVersions) {
            codeLens.command = {
                command: '',
                title: 'version not found',
            };
            return codeLens;
        }

        const { version } = data;
        const { latest, satisfied } = nodeVersions;
        if (version === latest) {
            codeLens.command = {
                command: '',
                title: 'latest',
            };
            return codeLens;
        }

        codeLens.command = {
            command: commands.replaceDocument,
            title: version === satisfied ? `latest lts ${latest}` : `satisfied ${satisfied}`,
            arguments: [
                this._document!.uri,
                codeLens.range,
                `v${version === satisfied ? latest : satisfied}`,
            ],
        };
        return codeLens;
    }
}
