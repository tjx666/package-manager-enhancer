import type { Range, TextEditor } from 'vscode';

export async function upgradeVersion(editor: TextEditor, versionRange: Range, newVersion: string) {
    return editor.edit((editBuilder) => {
        editBuilder.replace(versionRange, newVersion);
    });
}
