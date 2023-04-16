import * as vscode from 'vscode';

import { DependenciesCodeLens } from './codeLens/Dependencies';
import { PackageJsonCodeLensProvider } from './codeLens/packageJson';
import { PnpmWorkspaceCodeLensProvider } from './codeLens/pnpmWorkspace';
import { store } from './utils/store';

export function activate(ctx: vscode.ExtensionContext) {
    store.storageDir = ctx.storageUri!.fsPath;

    const pkgJsonSelector = {
        language: 'json',
        pattern: '**/package.json',
    };

    ctx.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            {
                language: 'yaml',
                pattern: '**/pnpm-workspace.yaml',
            },
            new PnpmWorkspaceCodeLensProvider(),
        ),
        vscode.languages.registerCodeLensProvider(
            pkgJsonSelector,
            new PackageJsonCodeLensProvider(),
        ),
        vscode.languages.registerCodeLensProvider(pkgJsonSelector, new DependenciesCodeLens()),
        vscode.commands.registerCommand(
            'package-manager-enhancer.showReferencesInPanel',
            async (...args: any[]) =>
                import('./commands/showReferencesInPanel').then((mod) =>
                    (mod.showReferencesInPanel as any)(...args),
                ),
        ),
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
