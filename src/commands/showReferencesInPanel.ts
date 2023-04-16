import * as vscode from 'vscode';

export async function showReferencesInPanel(
    uri: vscode.Uri,
    position: vscode.Position,
    fileNames: string[],
) {
    if (fileNames.length === 1) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileNames[0]));
        return;
    }

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
                    new vscode.Location(vscode.Uri.file(fileName), new vscode.Range(0, 0, 0, 0)),
            ),
        );
    } finally {
        await config.update('preferredLocation', existingSetting);
    }
}
