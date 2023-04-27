import { basename, dirname, resolve } from 'node:path';

import { detect } from 'detect-package-manager';
import { ShellExecution, Task, Uri, tasks, workspace } from 'vscode';

interface Args {
    scriptName: string;
    script: string;
    cwd: string;
}

async function detectPm(folder: Uri) {
    const packageManagerName = workspace
        .getConfiguration('npm', folder)
        .get<string>('packageManager', 'npm');
    if (packageManagerName !== 'auto') return packageManagerName;
    return detect({ cwd: folder.fsPath });
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
