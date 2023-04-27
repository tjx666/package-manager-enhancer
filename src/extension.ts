import type { DocumentSelector } from 'vscode';
import vscode from 'vscode';

import { PackageJsonDependenciesCodeLensProvider } from './codeLens/packageJsonDependencies';
import { PackageJsonFilesCodeLensProvider } from './codeLens/packageJsonFiles';
import { PnpmWorkspaceCodeLensProvider } from './codeLens/pnpmWorkspace';
import { updateConfiguration } from './configuration';
import { NpmScriptsHoverProvider } from './hoverTooltips/npmScripts';
import { logger } from './logger';
import type { Command } from './utils/constants';
import { extensionName, commands } from './utils/constants';
import { store } from './utils/store';

export function activate(context: vscode.ExtensionContext) {
    const { storageUri, subscriptions } = context;
    store.storageDir = storageUri!.fsPath;
    vscode.workspace.onDidChangeConfiguration(
        async (event) => {
            if (event.affectsConfiguration(extensionName)) {
                await updateConfiguration();
            }
        },
        null,
        subscriptions,
    );

    const registerCommand = (
        command: Command,
        callback: (...args: any[]) => any,
        thisArg?: any,
    ) => {
        const cmd = vscode.commands.registerCommand(command, callback, thisArg);
        context.subscriptions.push(cmd);
        return cmd;
    };

    registerCommand(commands.showReferencesInPanel, (...args: any[]) =>
        import('./commands/showReferencesInPanel').then((mod) =>
            (mod.showReferencesInPanel as any)(...args),
        ),
    );
    registerCommand(commands.removeUnusedDependency, (...args: any[]) =>
        import('./commands/removeUnusedDependency').then((mod) =>
            (mod.removeUnusedDependency as any)(...args),
        ),
    );
    registerCommand(commands.showPackageJsonDependenciesCodeLens, () =>
        import('./commands/togglePackageJsonDependenciesCodeLens').then((mod) =>
            mod.togglePackageJsonDependenciesCodeLens(),
        ),
    );

    registerCommand(commands.hidePackageJsonDependenciesCodeLens, () =>
        import('./commands/togglePackageJsonDependenciesCodeLens').then((mod) =>
            mod.togglePackageJsonDependenciesCodeLens(),
        ),
    );

    registerCommand(commands.runNpmScriptBackground, (...args: any[]) =>
        import('./commands/runNpmScriptBackground').then((mod) =>
            (mod.runNpmScriptBackground as any)(...args),
        ),
    );

    const pkgJsonSelector: DocumentSelector = {
        language: 'json',
        scheme: 'file',
        pattern: '**/package.json',
    };
    subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            {
                language: 'yaml',
                scheme: 'file',
                pattern: '**/pnpm-workspace.yaml',
            },
            new PnpmWorkspaceCodeLensProvider(context),
        ),
        vscode.languages.registerCodeLensProvider(
            pkgJsonSelector,
            new PackageJsonFilesCodeLensProvider(context),
        ),
        vscode.languages.registerCodeLensProvider(
            pkgJsonSelector,
            new PackageJsonDependenciesCodeLensProvider(context),
        ),
        vscode.languages.registerHoverProvider(pkgJsonSelector, new NpmScriptsHoverProvider()),
    );
}

export function deactivate() {
    logger.dispose();
}
