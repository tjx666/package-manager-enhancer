import vscode from 'vscode';

export async function openDocument(document: vscode.Uri, languageId?: string): Promise<void> {
    const textDocument = await vscode.workspace.openTextDocument(document);
    if (languageId !== undefined) {
        vscode.languages.setTextDocumentLanguage(textDocument, languageId);
    }
    await vscode.window.showTextDocument(textDocument);
}
