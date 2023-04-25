import { ShellExecution, Task, TaskScope, tasks } from 'vscode';

interface Args {
    scriptName: string;
    script: string;
    cwd: string;
}

export async function runNpmScriptBackground(args: Args) {
    const shellExecution = new ShellExecution(args.script, {
        cwd: args.cwd,
    });
    const backgroundTask = new Task(
        { type: 'shell' },
        TaskScope.Workspace,
        'npm',
        args.scriptName,
        shellExecution,
    );
    backgroundTask.isBackground = true;
    return tasks.executeTask(backgroundTask);
}
