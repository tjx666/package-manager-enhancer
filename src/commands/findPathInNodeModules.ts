import { basename, dirname, join } from 'path';
import type { Uri } from 'vscode';
import { window, workspace } from 'vscode';

import { NODE_MODULES } from '../utils/constants';
import showQuickPickFile from '../utils/showQuickPickFile';
import { showPickWorkspaceFolder } from '../utils/window';

export async function findPathInNodeModules(uri: Uri) {
    let node_modulesPath = uri ? uri.path : '';
    if (!node_modulesPath) {
        let projectRootPath: string;
        try {
            projectRootPath = await showPickWorkspaceFolder();
            if (!projectRootPath) {
                window.showErrorMessage('Please select the node_modules project to search');
                return;
            }
        } catch {
            projectRootPath = '';
            window.showErrorMessage('The current workspace does not have an open project');
            return;
        }
        node_modulesPath = join(projectRootPath, NODE_MODULES);
    }
    const filePath = await showQuickPickFile(
        node_modulesPath,
        join(basename(dirname(node_modulesPath)), NODE_MODULES),
    );
    if (filePath) {
        const doc = await workspace.openTextDocument(filePath);
        window.showTextDocument(doc);
    }
}
