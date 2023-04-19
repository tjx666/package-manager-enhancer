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

    subscriptions.push(
        vscode.commands.registerCommand(
            'package-manager-enhancer.showReferencesInPanel',
            (...args: any[]) =>
                import('./commands/showReferencesInPanel').then((mod) =>
                    (mod.showReferencesInPanel as any)(...args),
                ),
        ),
        vscode.commands.registerCommand('package-manager-enhancer.deleteLine', (...args: any[]) =>
            import('./commands/deleteLine').then((mod) => (mod.deleteLine as any)(...args)),
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
