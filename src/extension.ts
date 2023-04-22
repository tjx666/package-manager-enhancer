import vscode from 'vscode';

import { updateConfiguration } from './configuration';
import { logger } from './logger';
import { store } from './utils/store';

export function activate(context: vscode.ExtensionContext) {
    const { storageUri, subscriptions } = context;
    store.storageDir = storageUri!.fsPath;
    vscode.workspace.onDidChangeConfiguration(updateConfiguration, null, subscriptions);

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
    registerCommand('showPackageJsonDependenciesCodeLens', () =>
        import('./commands/togglePackageJsonDependenciesCodeLens').then((mod) =>
            mod.togglePackageJsonDependenciesCodeLens(),
        ),
    );

    registerCommand('hidePackageJsonDependenciesCodeLens', () =>
        import('./commands/togglePackageJsonDependenciesCodeLens').then((mod) =>
            mod.togglePackageJsonDependenciesCodeLens(),
        ),
    );

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

    const pkgJsonSelector = {
        language: 'json',
        pattern: '**/package.json',
    };
    import('./codeLens/packageJsonFiles').then((mod) => {
        subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                pkgJsonSelector,
                new mod.PackageJsonFilesCodeLensProvider(context),
            ),
        );
    });

    import('./codeLens/packageJsonDependencies').then((mod) => {
        subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                pkgJsonSelector,
                new mod.PackageJsonDependenciesCodeLensProvider(context),
            ),
        );
    });
}

export function deactivate() {
    logger.dispose();
}
