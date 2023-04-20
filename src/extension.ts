import vscode from 'vscode';

import { configuration, updateConfiguration } from './configuration';
import { store } from './utils/store';

export function activate(context: vscode.ExtensionContext) {
    const { storageUri, subscriptions } = context;
    store.storageDir = storageUri!.fsPath;
    vscode.workspace.onDidChangeConfiguration(updateConfiguration, null, subscriptions);

    const pkgJsonSelector = {
        language: 'json',
        pattern: '**/package.json',
    };

    const registerCommand = (
        commandName: string,
        callback: (...args: any[]) => any,
        thisArg?: any,
    ) => {
        const cmd = vscode.commands.registerCommand(
            `package-manager-enhancer.${commandName}`,
            callback,
            thisArg,
        );
        context.subscriptions.push(cmd);
        return cmd;
    };

    registerCommand('showReferencesInPanel', (...args: any[]) =>
        import('./commands/showReferencesInPanel').then((mod) =>
            (mod.showReferencesInPanel as any)(...args),
        ),
    );
    registerCommand('removeUnusedDependency', (...args: any[]) =>
        import('./commands/removeUnusedDependency').then((mod) =>
            (mod.removeUnusedDependency as any)(...args),
        ),
    );
    registerCommand('togglePackageJsonDependenciesCodeLens', () =>
        import('./commands/togglePackageJsonDependenciesCodeLens').then((mod) =>
            mod.togglePackageJsonDependenciesCodeLens(),
        ),
    );

    if (configuration.enablePnpmWorkspaceCodeLens) {
        import('./codeLens/pnpmWorkspace').then((mod) => {
            subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    {
                        language: 'yaml',
                        pattern: '**/pnpm-workspace.yaml',
                    },
                    new mod.PnpmWorkspaceCodeLensProvider(context),
                ),
            );
        });
    }

    if (configuration.enablePackageJsonFilesCodeLens) {
        import('./codeLens/packageJsonFiles').then((mod) => {
            subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    pkgJsonSelector,
                    new mod.PackageJsonFilesCodeLensProvider(context),
                ),
            );
        });
    }

    if (configuration.enablePackageJsonDependenciesCodeLens) {
        import('./codeLens/packageJsonDependencies').then((mod) => {
            subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    pkgJsonSelector,
                    new mod.PackageJsonDependenciesCodeLensProvider(context),
                ),
            );
        });
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
