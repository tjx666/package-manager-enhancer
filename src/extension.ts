import type { DocumentSelector, TextEditor } from 'vscode';
import vscode from 'vscode';

import { NodeVersionCodeLensProvider } from './codeLens/nodeVersion';
import { PackageJsonDependenciesCodeLensProvider } from './codeLens/packageJsonDependencies';
import { PackageJsonFilesCodeLensProvider } from './codeLens/packageJsonFiles';
import { PackageJsonVersionCodeLensProvider } from './codeLens/packageJsonVersion';
import { PnpmWorkspaceCodeLensProvider } from './codeLens/pnpmWorkspace';
import { updateConfiguration } from './configuration';
import { DependenciesDefinitionProvider } from './definitions/dependencies';
import { DependenciesHoverProvider } from './hoverTooltips/dependencies';
import { NpmScriptsHoverProvider } from './hoverTooltips/npmScripts';
import { logger } from './logger';
import type { Command } from './utils/constants';
import { commands, EXT_NAME } from './utils/constants';
import { store } from './utils/store';

export function activate(context: vscode.ExtensionContext) {
    const { storageUri, subscriptions } = context;
    store.storageDir = storageUri!.fsPath;
    vscode.workspace.onDidChangeConfiguration(
        async (event) => {
            if (event.affectsConfiguration(EXT_NAME)) {
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

    const registerTextEditorCommand = (
        command: Command,
        callback: (editor: TextEditor) => any,
        thisArg?: any,
    ) => {
        const cmd = vscode.commands.registerTextEditorCommand(command, callback, thisArg);
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

    registerCommand(commands.runNpmScriptInTerminal, (...args: any[]) =>
        import('./commands/runNpmScriptInTerminal').then((mod) =>
            (mod.runNpmScriptInTerminal as any)(...args),
        ),
    );

    registerTextEditorCommand(commands.addMissingDeps, (editor) =>
        import('./commands/addMissingDeps').then((mod) => mod.addMissingDeps(editor)),
    );

    registerTextEditorCommand(commands.upgradeVersion, (...args: any[]) =>
        import('./commands/upgradeVersion').then((mod) =>
            mod.upgradeVersion(args[0], args[2], args[3]),
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
        vscode.languages.registerCodeLensProvider(
            pkgJsonSelector,
            new PackageJsonVersionCodeLensProvider(context),
        ),
        vscode.languages.registerCodeLensProvider(
            {
                // language: 'plaintext',
                scheme: 'file',
                pattern: '**/{.nvmrc,.node-version}',
            },
            new NodeVersionCodeLensProvider(context),
        ),
        vscode.languages.registerHoverProvider(pkgJsonSelector, new NpmScriptsHoverProvider()),
        vscode.languages.registerHoverProvider(pkgJsonSelector, new DependenciesHoverProvider()),
        vscode.languages.registerDefinitionProvider(
            pkgJsonSelector,
            new DependenciesDefinitionProvider(),
        ),
    );
}

export function deactivate() {
    logger.dispose();
}
