import allNodeVersions from 'all-node-versions';
import ExpiryMap from 'expiry-map';
import pMemoize from 'p-memoize';
import type { CancellationToken, ExtensionContext, TextDocument } from 'vscode';
import { CodeLens, Range } from 'vscode';

import { configuration, configurationKeys } from '../configuration';
import { commands } from '../utils/constants';
import { BaseCodeLensProvider } from './BaseCodeLensProvider';

type NodeVersions = {
    satisfied: string;
    latest: string;
} | null;

// 2 mins
const cache = new ExpiryMap(1000 * 60 * 2);
const fetchNodeVersions = pMemoize(
    async (version: string): Promise<NodeVersions> => {
        const { versions, majors } = await allNodeVersions({
            mirror: 'https://npmmirror.com/mirrors/node',
        });

        // version not found
        if (versions.every((v) => !v.node.startsWith(version))) {
            return null;
        }

        const majorNumber = Number(version.split('.')[0]);
        const satisfied = majors.find((major) => major.major === majorNumber)!.latest;
        const latest = majors.find((major) => major.lts)!.latest;
        return {
            satisfied,
            latest,
        };
    },
    { cache },
);

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
            fetchNodeVersionsPromise: fetchNodeVersions(version),
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
            command: commands.upgradeVersion,
            title: version === satisfied ? `latest lts ${latest}` : `satisfied ${satisfied}`,
            arguments: [codeLens.range, `v${version === satisfied ? latest : satisfied}`],
        };
        return codeLens;
    }
}
