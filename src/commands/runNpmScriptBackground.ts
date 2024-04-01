import { basename, dirname, resolve } from 'node:path';

import { ShellExecution, Task, tasks, Uri, workspace } from 'vscode';

import { detectPm } from '../utils/pm';

interface Args {
    scriptName: string;
    script: string;
    cwd: string;
}

export async function runNpmScriptBackground(args: Args) {
    const workspaceFolder = workspace.getWorkspaceFolder(
        Uri.file(resolve(args.cwd, 'package.json')),
    );
    if (!workspaceFolder) return;

    const pm = await detectPm(workspaceFolder.uri);
    const shellExecution = new ShellExecution(pm, ['run', args.scriptName], { cwd: args.cwd });

    const taskNameFolder =
        args.cwd === workspaceFolder.uri.fsPath
            ? ''
            : ` - ${basename(dirname(args.cwd))}/${basename(args.cwd)}`;
    const backgroundTask = new Task(
        { type: 'npm', script: args.scriptName },
        workspaceFolder,
        // dev-app/design
        `${args.scriptName}${taskNameFolder}`,
        'npm',
        shellExecution,
    );
    backgroundTask.isBackground = true;
    backgroundTask.detail = args.script;
    return tasks.executeTask(backgroundTask);
}
