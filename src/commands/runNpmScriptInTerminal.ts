import { resolve } from 'node:path';

import vscode, { Uri, workspace } from 'vscode';

import { detectPm } from '../utils/pm';

interface Args {
    scriptName: string;
    script: string;
    cwd: string;
}

export async function runNpmScriptInTerminal(args: Args) {
    const workspaceFolder = workspace.getWorkspaceFolder(
        Uri.file(resolve(args.cwd, 'package.json')),
    );
    if (!workspaceFolder) return;

    const pm = await detectPm(workspaceFolder.uri);
    const terminalName = 'Run Script';
    let terminal = vscode.window.terminals.find((terminal) => terminal.name === terminalName);
    if (terminal) {
        terminal.sendText(`cd ${args.cwd}`);
    } else {
        terminal = vscode.window.createTerminal({
            name: terminalName,
            cwd: args.cwd,
        });
    }
    terminal.sendText(`${pm} run ${args.scriptName}`);
    terminal.show();
}
