import vscode from 'vscode';

export async function replaceDocument(uri: vscode.Uri, range: vscode.Range, newText: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, range, newText);
    await vscode.workspace.applyEdit(edit);
}
