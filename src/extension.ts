import * as vscode from 'vscode';

import { PackageJsonCodeLensProvider } from './codeLens/packageJson';
import { PnpmWorkspaceCodeLensProvider } from './codeLens/pnpmWorkspace';

export function activate({ subscriptions }: vscode.ExtensionContext) {
    subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            {
                language: 'yaml',
                pattern: '**/pnpm-workspace.yaml',
            },
            new PnpmWorkspaceCodeLensProvider(),
        ),
        vscode.languages.registerCodeLensProvider(
            {
                language: 'json',
                pattern: '**/package.json',
            },
            new PackageJsonCodeLensProvider(),
        ),
    );

    subscriptions.push(
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
