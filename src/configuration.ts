import vscode from 'vscode';

interface Configuration {
    enablePnpmWorkspaceCodeLens: boolean;
    enablePackageJsonFilesCodeLens: boolean;
    enablePackageJsonDependenciesCodeLens: boolean;
    packageJsonDependenciesCodeLens: {
        dependenciesNodePaths: string[];
        searchDependenciesFileExtensions: string[];
        searchDependenciesExcludePatterns: string[];
    };
}

export const configuration: Configuration = {} as Configuration;
updateConfiguration();

export function updateConfiguration() {
    const extensionConfig = vscode.workspace.getConfiguration('package-manager-enhancer');

    configuration.enablePnpmWorkspaceCodeLens = extensionConfig.get('enablePnpmWorkspaceCodeLens')!;
    configuration.enablePackageJsonFilesCodeLens = extensionConfig.get(
        'enablePackageJsonFilesCodeLens',
    )!;
    configuration.enablePackageJsonDependenciesCodeLens = extensionConfig.get(
        'enablePackageJsonDependenciesCodeLens',
    )!;

    configuration.packageJsonDependenciesCodeLens = extensionConfig.get(
        'packageJsonDependenciesCodeLens',
    ) as Configuration['packageJsonDependenciesCodeLens'];
}
