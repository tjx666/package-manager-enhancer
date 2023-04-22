import vscode, { ConfigurationTarget } from 'vscode';

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

    togglePackageJsonDependenciesCodeLens(): Promise<void>;
}

export const configuration: Configuration = {
    togglePackageJsonDependenciesCodeLens() {
        return vscode.workspace
            .getConfiguration()
            .update(
                'package-manager-enhancer.enablePackageJsonDependenciesCodeLens',
                !configuration.enablePackageJsonDependenciesCodeLens,
                ConfigurationTarget.Global,
            );
    },
} as Configuration;
updateConfiguration();

export function updateConfiguration() {
    const extensionConfig = vscode.workspace.getConfiguration('package-manager-enhancer');

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
    vscode.commands.executeCommand(
        'setContext',
        'package-manager-enhancer.enablePackageJsonDependenciesCodeLens',
        configuration.enablePackageJsonDependenciesCodeLens,
    );
    configuration.packageJsonDependenciesCodeLens = extensionConfig.get(
        'packageJsonDependenciesCodeLens',
    ) as Configuration['packageJsonDependenciesCodeLens'];
}
