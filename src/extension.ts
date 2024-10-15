import { watchFile } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import type { TextEditor } from 'vscode';
import vscode from 'vscode';

import { NodeVersionCodeLensProvider } from './codeLens/nodeVersion';
import { PackageJsonDependenciesCodeLensProvider } from './codeLens/packageJsonDependencies';
import { PackageJsonFilesCodeLensProvider } from './codeLens/packageJsonFiles';
import { PackageJsonVersionCodeLensProvider } from './codeLens/packageJsonVersion';
import { PnpmWorkspaceCodeLensProvider } from './codeLens/pnpmWorkspace';
import { NpmrcCompletionItemProvider } from './completion/npmrc';
import { updateConfiguration } from './configuration';
import { DependenciesDefinitionProvider } from './definitions/dependencies';
import { diagnosticCollection, updateDiagnostic } from './diagnostic/DepsCheckCodeActionProvider';
import {
    updateVSCodeExtensionDiagnostic,
    VSCodeExtensionCodeActionProvider,
    vscodeExtensionDiagnosticCollection,
} from './diagnostic/VSCodeExtensionCodeActionProvider';
import { DependenciesHoverProvider } from './hoverTooltips/dependencies';
import { ModulesHoverProvider } from './hoverTooltips/modules';
import { NpmScriptsHoverProvider } from './hoverTooltips/npmScripts';
import { logger } from './logger';
import type { Command } from './utils/constants';
import { commands, EXT_NAME, npmrcSelector, pkgJsonSelector } from './utils/constants';
import { pathExists } from './utils/fs';
import { store } from './utils/store';

export function activate(context: vscode.ExtensionContext) {
    const { storageUri, subscriptions } = context;

    const storageDir = storageUri!.fsPath;
    store.storageDir = storageDir;
    (async function () {
        if (!(await pathExists(storageDir))) {
            await fs.mkdir(storageDir);
        }
    })();

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

    registerCommand(commands.keepInstalledVersion, (arg) =>
        import('./commands/keepInstalledVersion').then((mod) => mod.keepInstalledVersion(arg)),
    );

    registerTextEditorCommand(commands.addMissingDeps, (editor) =>
        import('./commands/addMissingDeps').then((mod) => mod.addMissingDeps(editor)),
    );

    registerTextEditorCommand(commands.upgradeVersion, (...args: any[]) =>
        import('./commands/upgradeVersion').then((mod) =>
            mod.upgradeVersion(args[0], args[2], args[3]),
        ),
    );

    registerCommand(commands.findNpmPackage, (uri) =>
        import('./commands/findNpmPackage').then((mod) => mod.findNpmPackage(uri)),
    );

    registerCommand(commands.findPathInNodeModules, (uri) =>
        import('./commands/findPathInNodeModules').then((mod) => mod.findPathInNodeModules(uri)),
    );

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
        vscode.languages.registerHoverProvider(
            [
                'javascript',
                'typescript',
                'javascriptreact',
                'typescriptreact',
                'vue',
                'astro',
                'svelte',
                'mdx',
                'html',
            ],
            new ModulesHoverProvider(),
        ),
        vscode.languages.registerDefinitionProvider(
            pkgJsonSelector,
            new DependenciesDefinitionProvider(),
        ),
        vscode.languages.registerCompletionItemProvider(
            npmrcSelector,
            new NpmrcCompletionItemProvider(),
        ),
    );

    // 注册新的诊断和代码操作提供程序
    subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            pkgJsonSelector,
            new VSCodeExtensionCodeActionProvider(),
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            },
        ),
    );

    registerCommand(commands.replaceDocument, (...args: any[]) =>
        import('./diagnostic/VSCodeExtensionCodeActionProvider').then((mod) =>
            mod.replaceDocument(args[0], args[1], args[2]),
        ),
    );

    for (const editor of vscode.window.visibleTextEditors) {
        updateDiagnostic(editor.document);
        updateVSCodeExtensionDiagnostic(editor.document);
    }

    subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            updateDiagnostic(document);
            updateVSCodeExtensionDiagnostic(document);
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            updateDiagnostic(event.document);
            updateVSCodeExtensionDiagnostic(event.document);
        }),
    );

    const filesToWatch = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb'].map(
        (file) => path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, file),
    );
    const watchers = filesToWatch.map((file) => {
        const watcher = watchFile(file, () => {
            for (const editor of vscode.window.visibleTextEditors) {
                updateDiagnostic(editor.document);
                updateVSCodeExtensionDiagnostic(editor.document);
            }
        });
        return watcher;
    });
    subscriptions.push({
        dispose() {
            for (const watcher of watchers) {
                watcher.removeAllListeners();
            }
        },
    });
}

export function deactivate() {
    diagnosticCollection.dispose();
    vscodeExtensionDiagnosticCollection.dispose();
    logger.dispose();
}
