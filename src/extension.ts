import * as vscode from 'vscode';

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
    );

    subscriptions.push(
        vscode.commands.registerCommand(
            'package-manager-enhancer.showPnpmWorkspacePackages',
            async (uri: vscode.Uri, position: vscode.Position, fileNames: string[]) => {
                const config = vscode.workspace.getConfiguration('references');
                const existingSetting = config.get('preferredLocation');
                // !: will open peek view by default
                await config.update('preferredLocation', 'view');
                try {
                    await vscode.commands.executeCommand(
                        'editor.action.showReferences',
                        uri,
                        position,
                        fileNames.map(
                            (fileName) =>
                                new vscode.Location(
                                    vscode.Uri.file(fileName),
                                    new vscode.Range(0, 0, 0, 0),
                                ),
                        ),
                    );
                } finally {
                    await config.update('preferredLocation', existingSetting);
                }
            },
        ),
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
