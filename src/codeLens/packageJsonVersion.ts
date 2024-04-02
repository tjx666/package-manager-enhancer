import ExpiryMap from 'expiry-map';
import pMemoize from 'p-memoize';
import fetchPackageJson from 'package-json';
import type { CancellationToken, ExtensionContext, Range, TextDocument } from 'vscode';
import { CodeLens } from 'vscode';

import { configuration, configurationKeys } from '../configuration';
import { commands } from '../utils/constants';
import { jsoncStringNodeToRange, parseJsonc } from '../utils/jsonc';
import { BaseCodeLensProvider } from './BaseCodeLensProvider';

interface CodeLensData {
    name: string;
    version: string;
    versionRange: Range;
    fetchVersionsPromise: Promise<{
        latest: string;
        satisfied: string;
    }>;
}

// 2 mins
const cache = new ExpiryMap(1000 * 60 * 2);
const fetchVersions = pMemoize(
    async (pmName: string, pmVersion: string) => {
        const registryUrl = 'https://registry.npmmirror.com/';
        const [latestPkg, satisfiedPkg] = await Promise.all([
            fetchPackageJson(pmName, { registryUrl }),
            fetchPackageJson(pmName, { version: `^${pmVersion}`, registryUrl }),
        ]);
        return {
            latest: latestPkg.version,
            satisfied: satisfiedPkg.version,
        };
    },
    { cache, cacheKey: (arguments_) => arguments_.join('@') },
);

export class PackageJsonVersionCodeLensProvider extends BaseCodeLensProvider {
    private _codeLensDataMap: Map<CodeLens, CodeLensData> = new Map();

    constructor(context: ExtensionContext) {
        super(
            context,
            () => configuration.enablePackageJsonVersionCodeLens,
            (e) => e.affectsConfiguration(configurationKeys.enablePackageJsonVersionCodeLens),
        );
    }

    protected _reset(_document?: TextDocument | undefined): void {
        this._codeLensDataMap.clear();
    }

    public async getCodeLenses(
        document: TextDocument,
        _token: CancellationToken,
    ): Promise<CodeLens[] | undefined> {
        const packageJson = document.getText();
        const { findNodeAtLocation } = await import('jsonc-parser');
        const root = await parseJsonc(packageJson);
        if (!root) return;

        const codeLensList: CodeLens[] = [];
        const packageManagerNode = findNodeAtLocation(root, ['packageManager'])?.parent;
        if (
            packageManagerNode &&
            packageManagerNode.type === 'property' &&
            packageManagerNode.children?.length === 2
        ) {
            const valueNode = packageManagerNode.children[1];
            const match = (valueNode.value as string).match(
                // eslint-disable-next-line regexp/optimal-quantifier-concatenation
                /(?<pmName>(npm|pnpm|yarn|bun))@(?<pmVersion>\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?)[^@]*/,
            );
            if (match) {
                const { pmName, pmVersion } = match.groups!;
                if (pmName && pmVersion) {
                    const keyNode = packageManagerNode.children[0];
                    const codeLens = new CodeLens(jsoncStringNodeToRange(document, keyNode));
                    codeLensList.push(codeLens);

                    this._codeLensDataMap.set(codeLens, {
                        name: pmName,
                        version: pmVersion,
                        versionRange: jsoncStringNodeToRange(document, valueNode),
                        fetchVersionsPromise: fetchVersions(pmName, pmVersion),
                    });
                }
            }
        }

        return codeLensList;
    }

    public async resolveCodeLens(
        codeLens: CodeLens,
        _token: CancellationToken,
    ): Promise<CodeLens | undefined> {
        const data = this._codeLensDataMap.get(codeLens);
        if (!data) return codeLens;

        const { name, version } = data;
        let versions: Awaited<typeof data.fetchVersionsPromise>;
        try {
            versions = await data.fetchVersionsPromise;
        } catch {
            codeLens.command = {
                command: '',
                title: 'version not found',
            };
            return codeLens;
        }
        const { latest, satisfied } = versions;
        if (version === latest) {
            codeLens.command = {
                command: '',
                title: 'latest',
            };
            return codeLens;
        }

        codeLens.command = {
            title: version === satisfied ? `latest ${latest}` : `satisfied ${satisfied}`,
            command: commands.upgradeVersion,
            arguments: [data.versionRange, `${name}@${version === satisfied ? latest : satisfied}`],
        };
        return codeLens;
    }
}
