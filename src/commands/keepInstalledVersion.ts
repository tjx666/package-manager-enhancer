import vscode from 'vscode';

interface Args {
    versionRange: vscode.Range;
    installedVersion: string;
}
export async function keepInstalledVersion(arg: Args) {
    const editor = vscode.window.activeTextEditor;

    editor?.edit((editBuilder) => {
        editBuilder.replace(arg.versionRange, arg.installedVersion);
    });
}
