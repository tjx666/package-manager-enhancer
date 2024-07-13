import vscode, { ConfigurationTarget } from 'vscode';

import { EXT_NAME } from './utils/constants';

interface Configuration {
    enableLogInfo: boolean;
    enablePnpmWorkspaceCodeLens: boolean;
    pnpmWorkspaceCodeLens: {
        titleFormat: string;
    };
    enablePackageJsonFilesCodeLens: boolean;
    packageJsonFilesCodeLens: {
        includeDefaultPackedFiles: boolean;
        titleFormat: string;
    };
    enablePackageJsonDependenciesCodeLens: boolean;
    packageJsonDependenciesCodeLens: {
        dependenciesNodePaths: string[];
        searchDependenciesFileExtensions: string[];
        searchDependenciesExcludePatterns: string[];
        ignorePatterns: string[];
    };
    enablePackageJsonVersionCodeLens: boolean;
    enableNodeVersionCodeLens: boolean;
    packageHoverTooltip: {
        websites: string[];
        badges: string[];
    };
    depsVersionCheck: {
        enable: boolean;
        dependenciesNodePaths: string[];
    };
}

export const configuration: Configuration = {} as Configuration;
export async function updateConfiguration() {
    const extensionConfig = vscode.workspace.getConfiguration(EXT_NAME);

    configuration.enableLogInfo = extensionConfig.get('enableLogInfo')!;

    configuration.enablePnpmWorkspaceCodeLens = extensionConfig.get<boolean>(
        'enablePnpmWorkspaceCodeLens',
    )!;
    configuration.pnpmWorkspaceCodeLens =
        extensionConfig.get<Configuration['pnpmWorkspaceCodeLens']>('pnpmWorkspaceCodeLens')!;

    configuration.enablePackageJsonFilesCodeLens = extensionConfig.get<boolean>(
        'enablePackageJsonFilesCodeLens',
    )!;
    configuration.packageJsonFilesCodeLens = extensionConfig.get<
        Configuration['packageJsonFilesCodeLens']
    >('packageJsonFilesCodeLens')!;

    configuration.enablePackageJsonDependenciesCodeLens = extensionConfig.get<boolean>(
        'enablePackageJsonDependenciesCodeLens',
    )!;
    configuration.packageJsonDependenciesCodeLens = extensionConfig.get<
        Configuration['packageJsonDependenciesCodeLens']
    >('packageJsonDependenciesCodeLens')!;
    await vscode.commands.executeCommand(
        'setContext',
        `${EXT_NAME}.enablePackageJsonDependenciesCodeLens`,
        configuration.enablePackageJsonDependenciesCodeLens,
    );

    configuration.enablePackageJsonVersionCodeLens = extensionConfig.get<boolean>(
        'enablePackageJsonVersionCodeLens',
    )!;
    configuration.enableNodeVersionCodeLens = extensionConfig.get<boolean>(
        'enableNodeVersionCodeLens',
    )!;
    configuration.packageHoverTooltip =
        extensionConfig.get<Configuration['packageHoverTooltip']>('packageHoverTooltip')!;

    configuration.depsVersionCheck =
        extensionConfig.get<Configuration['depsVersionCheck']>('depsVersionCheck')!;
}
updateConfiguration();

type CfgToCfgKeys<T extends object, ParentPath extends string> = {
    [P in keyof T]: T[P] extends object
        ? T[P] extends string[]
            ? `${ParentPath}${P & string}`
            : CfgToCfgKeys<T[P], `${ParentPath}${P & string}`> & {
                  _key: `${ParentPath}${P & string}`;
              }
        : `${ParentPath}${P & string}`;
};
type ConfigurationKeys = CfgToCfgKeys<Configuration, typeof EXT_NAME>;
function setupKeys(cfg: Record<string, any>, cfgKeys: Record<string, any>, parentKeyPath = '') {
    for (const [key, value] of Object.entries(cfg)) {
        const newParentPath = `${parentKeyPath}${parentKeyPath === '' ? '' : '.'}${key}`;

        if (value !== null && typeof value === 'object') {
            const subObject = {
                _key: newParentPath,
            };
            cfgKeys[newParentPath] = subObject;
            setupKeys(value, subObject, newParentPath);
        } else {
            cfgKeys[newParentPath] = `${EXT_NAME}.${newParentPath}`;
        }
    }
    return cfgKeys;
}
export const configurationKeys = setupKeys(configuration, {}) as unknown as ConfigurationKeys;

export async function togglePackageJsonDependenciesCodeLens() {
    return vscode.workspace
        .getConfiguration()
        .update(
            configurationKeys.enablePackageJsonDependenciesCodeLens,
            !configuration.enablePackageJsonDependenciesCodeLens,
            ConfigurationTarget.Global,
        );
}
