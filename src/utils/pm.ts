import { detect } from 'detect-package-manager';
import type { Uri } from 'vscode';
import { workspace } from 'vscode';

export async function detectPm(folder: Uri) {
    const packageManagerName = workspace
        .getConfiguration('npm', folder)
        .get<string>('packageManager', 'npm');
    if (packageManagerName !== 'auto') return packageManagerName;
    return detect({ cwd: folder.fsPath });
}
