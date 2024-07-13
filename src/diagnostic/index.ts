import path from 'path';

import semver from 'semver';
import vscode from 'vscode';

import { findPkgInstallDir } from '../utils/pkg';
import { getPackageInfo } from '../utils/pkg-info';

function isJSONParsable(str: string) {
    try {
        JSON.parse(str);
    } catch {
        return false;
    }
    return true;
}

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('lints');

export async function updateDiagnostic(document: vscode.TextDocument) {
    if (
        !path.basename(document.uri.fsPath).includes('package.json') ||
        document.languageId !== 'json'
    )
        return;

    const text = document.getText();
    if (!isJSONParsable(text)) return;

    const diagnostics: vscode.Diagnostic[] = [];

    const packageJSON = JSON.parse(text);
    const { getLocation, getParsedByString } = await import('jsonpos');
    const parsed = getParsedByString(text);

    async function checkDependency(key: string) {
        await Promise.all(
            Object.entries(packageJSON[key] ?? {}).map(async ([name, version]) => {
                if (typeof version !== 'string') return;

                const location = getLocation(parsed, {
                    path: [key, name],
                });

                if (!location.start || !location.end) return;

                const range = new vscode.Range(
                    location.start.line - 1,
                    location.start.column - 1,
                    location.end.line - 1,
                    location.end.column - 1,
                );

                const packageInfo = await getPackageInfo(name, {
                    packageInstallDir: await findPkgInstallDir(name, document.uri.fsPath),
                    fetchBundleSize: false,
                    remoteFetch: false,
                    skipBuiltinModuleCheck: true,
                });

                if (packageInfo?.isBuiltinModule) return;

                if (!packageInfo || !packageInfo.installedVersion) {
                    diagnostics.push(
                        new vscode.Diagnostic(
                            range,
                            `Package "${name}" not found`,
                            vscode.DiagnosticSeverity.Warning,
                        ),
                    );
                    return;
                }

                const { version: installedVersion } = packageInfo;
                if (semver.validRange(version) && !semver.satisfies(installedVersion, version)) {
                    diagnostics.push(
                        new vscode.Diagnostic(
                            range,
                            `Installed version "${installedVersion}" does not satisfy "${version}"`,
                            vscode.DiagnosticSeverity.Warning,
                        ),
                    );
                }
            }),
        );
    }

    try {
        await Promise.all([
            checkDependency('dependencies'),
            checkDependency('devDependencies'),
            checkDependency('peerDependencies'),
        ]);

        diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
        console.error(error);
    }
}
