import vscode, { ConfigurationTarget } from 'vscode';

import { extensionName } from './utils/constants';

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
}

export const configuration: Configuration = {} as Configuration;
export async function updateConfiguration() {
    const extensionConfig = vscode.workspace.getConfiguration(extensionName);

    configuration.enableLogInfo = extensionConfig.get('enableLogInfo')!;

    configuration.enablePnpmWorkspaceCodeLens = extensionConfig.get('enablePnpmWorkspaceCodeLens')!;
    configuration.pnpmWorkspaceCodeLens = extensionConfig.get(
        'pnpmWorkspaceCodeLens',
    ) as Configuration['pnpmWorkspaceCodeLens'];

    configuration.enablePackageJsonFilesCodeLens = extensionConfig.get(
        'enablePackageJsonFilesCodeLens',
    )!;
    configuration.packageJsonFilesCodeLens = extensionConfig.get(
        'packageJsonFilesCodeLens',
    ) as Configuration['packageJsonFilesCodeLens'];

    configuration.enablePackageJsonDependenciesCodeLens = extensionConfig.get(
        'enablePackageJsonDependenciesCodeLens',
    )!;
    await vscode.commands.executeCommand(
        'setContext',
        `${extensionName}.enablePackageJsonDependenciesCodeLens`,
        configuration.enablePackageJsonDependenciesCodeLens,
    );
    configuration.packageJsonDependenciesCodeLens = extensionConfig.get(
        'packageJsonDependenciesCodeLens',
    ) as Configuration['packageJsonDependenciesCodeLens'];
}
updateConfiguration();

type CfgToCfgKeys<T extends object, ParentPath extends string> = {
    [P in keyof T]: T[P] extends object
        ? T[P] extends string[]
            ? `${ParentPath}${P & string}`
            : CfgToCfgKeys<T[P], `${ParentPath}${P & string}`>
        : `${ParentPath}${P & string}`;
};
type ConfigurationKeys = CfgToCfgKeys<Configuration, typeof extensionName>;
function setupKeys(cfg: Record<string, any>, cfgKeys: Record<string, any>, parentKeyPath = '') {
    for (const [key, value] of Object.entries(cfg)) {
        const newParentPath = `${parentKeyPath}${parentKeyPath === '' ? '' : '.'}${key}`;

        if (value !== null && typeof value === 'object') {
            const subObject = {};
            cfgKeys[newParentPath] = subObject;
            setupKeys(value, subObject, newParentPath);
        } else {
            cfgKeys[newParentPath] = `${extensionName}.${newParentPath}`;
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
