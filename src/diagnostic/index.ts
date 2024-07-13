import path from 'path';

import semver from 'semver';
import vscode from 'vscode';

import { configuration, updateConfiguration } from '../configuration';
import { commands } from '../utils/constants';
import { findPkgInstallDir } from '../utils/pkg';
import { getPackageInfo } from '../utils/pkg-info';
import { detectPm } from '../utils/pm';

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
    if (configuration.depsVersionCheck.enable === undefined) {
        await updateConfiguration();
    }

    if (!configuration.depsVersionCheck.enable) return;

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
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Package "${name}" not installed`,
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = 'package-manager-enhancer.packageNotFound';
                    diagnostics.push(diagnostic);
                    return;
                }

                const { version: installedVersion } = packageInfo;
                if (semver.validRange(version) && !semver.satisfies(installedVersion, version)) {
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Installed ${name} version "${installedVersion}" doesn't match declared version: "${version}"`,
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = 'package-manager-enhancer.unmetDependency';
                    diagnostics.push(diagnostic);
                }
            }),
        );
    }

    try {
        await Promise.all(
            configuration.depsVersionCheck.dependenciesNodePaths.map((path) =>
                checkDependency(path),
            ),
        );

        diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
        console.error(error);
    }
}

export const codeActionProvider: vscode.CodeActionProvider = {
    provideCodeActions: async (document) => {
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const pm = await detectPm(vscode.workspace.getWorkspaceFolder(document.uri)!.uri);

        const action = new vscode.CodeAction(`Run ${pm} install`, vscode.CodeActionKind.QuickFix);
        action.command = {
            command: commands.runNpmScriptInTerminal,
            title: `Run ${pm} install`,
            arguments: [
                {
                    command: 'install',
                    cwd: vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath,
                },
            ],
        };
        action.diagnostics = diagnostics.filter(
            (diagnostic) =>
                diagnostic.code === 'package-manager-enhancer.packageNotFound' ||
                diagnostic.code === 'package-manager-enhancer.unmetDependency',
        );
        return [action];
    },
};
