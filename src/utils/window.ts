import { window, workspace } from 'vscode';

export async function showPickWorkspaceFolder(): Promise<string> {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
        throw new Error('The current workspace does not have an open project');
    }
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0].uri.fsPath;
    } else {
        const pickResult = await window.showQuickPick(
            workspaceFolders!.map((item) => {
                return {
                    label: item.name,
                    fsPath: item.uri.fsPath,
                };
            }),
            {
                placeHolder: 'Please select workspace folder',
            },
        );

        return pickResult?.fsPath || '';
    }
}

export function getWorkspaceFolderPathByPath(path: string): string | undefined {
    const project = workspace.workspaceFolders?.find((project) => {
        return path.startsWith(project.uri.path);
    });
    return project?.uri.path;
}
