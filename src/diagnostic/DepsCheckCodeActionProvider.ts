import path from 'node:path';

import type { ParsedJson } from 'jsonpos';
import semver from 'semver';
import type { CodeActionProvider } from 'vscode';
import vscode from 'vscode';

import { configuration } from '../configuration';
import { logger } from '../logger';
import { commands, EXT_NAME, PACKAGE_JSON } from '../utils/constants';
import { findPkgInstallDir } from '../utils/pkg';
import { getPackageInfo } from '../utils/pkg-info';
import { detectPm } from '../utils/pm';

enum DepsCheckDiagnosticCode {
    PACKAGE_NOT_FOUND = `${EXT_NAME}.packageNotFound`,
    UNMET_DEPENDENCY = `${EXT_NAME}.unmetDependency`,
}

export async function updateDepsCheckDiagnostic(
    diagnosticCollection: vscode.DiagnosticCollection,
    document: vscode.TextDocument,
) {
    if (!configuration.depsVersionCheck.enable) return;

    if (
        !path.basename(document.uri.fsPath).includes(PACKAGE_JSON) ||
        document.languageId !== 'json'
    )
        return;

    const text = document.getText();

    const diagnostics: vscode.Diagnostic[] = [];

    const { getLocation, getParsedByString } = await import('jsonpos');
    let parsed: ParsedJson;
    try {
        parsed = getParsedByString(text);
    } catch (error: any) {
        logger.error(error);
        return;
    }

    async function checkDependency(key: string) {
        if (document.uri.fsPath.includes('node_modules') && key === 'devDependencies') return;

        const nodePath = key.split('.');
        if (nodePath.length === 0) return;

        let dependencies: Record<string, any> = parsed.json;
        nodePath.forEach((node) => {
            dependencies = dependencies[node] ?? {};
        });
        await Promise.all(
            Object.entries(dependencies).map(async ([name, version]) => {
                if (typeof version !== 'string' || !semver.validRange(version)) return;

                const location = getLocation(parsed, {
                    path: [...nodePath, name],
                });

                if (!location.start || !location.end) return;

                const range = new vscode.Range(
                    location.start.line - 1,
                    location.start.column - 1,
                    location.end.line - 1,
                    location.end.column - 1,
                );
                const packageInstallDir = await findPkgInstallDir(name, document.uri.fsPath);
                const packageInfo = await getPackageInfo(name, {
                    packageInstallDir,
                    fetchBundleSize: false,
                    remoteFetch: false,
                    skipBuiltinModuleCheck: true,
                });

                if (packageInfo?.isBuiltinModule) return;

                // not installed
                if (!packageInfo || !packageInfo.installedVersion) {
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Package "${name}" not installed`,
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = DepsCheckDiagnosticCode.PACKAGE_NOT_FOUND;
                    diagnostic.data = {
                        depName: name,
                        depDeclaredVersion: version,
                    };
                    diagnostics.push(diagnostic);
                    return;
                }

                // doesn't match declared version
                const { version: installedVersion } = packageInfo;
                if (!semver.satisfies(installedVersion, version)) {
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Installed ${name} version "${installedVersion}" doesn't match declared version: "${version}"`,
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = DepsCheckDiagnosticCode.UNMET_DEPENDENCY;
                    diagnostic.data = {
                        depName: name,
                        depDeclaredVersion: version,
                        depInstalledVersion: installedVersion,
                    };

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

export class DepsCheckCodeActionProvider implements CodeActionProvider {
    private createNpmInstallAction(diagnostics: vscode.Diagnostic[], pm: string, cwd: string) {
        const runInstallTitle = `Run "${pm} install"`;
        const runInstallAction = new vscode.CodeAction(
            runInstallTitle,
            vscode.CodeActionKind.QuickFix,
        );
        runInstallAction.command = {
            command: commands.runNpmScriptInTerminal,
            title: runInstallTitle,
            arguments: [
                {
                    command: 'install',
                    cwd,
                },
            ],
        };
        runInstallAction.diagnostics = diagnostics;
        return runInstallAction;
    }

    private createNpmInstallSingleAction(
        diagnostics: vscode.Diagnostic[],
        pm: string,
        cwd: string,
    ) {
        const { depName, depDeclaredVersion } = diagnostics[0].data!;
        const packageNameAndVersion = `${depName}@${depDeclaredVersion}`;
        const runInstallSingleTitle = `Run "${pm} install ${packageNameAndVersion}"`;
        const runInstallSingleAction = new vscode.CodeAction(
            runInstallSingleTitle,
            vscode.CodeActionKind.QuickFix,
        );
        runInstallSingleAction.command = {
            command: commands.runNpmScriptInTerminal,
            title: runInstallSingleTitle,
            arguments: [
                {
                    command: `install ${packageNameAndVersion}`,
                    cwd,
                },
            ],
        };
        runInstallSingleAction.diagnostics = diagnostics;
        return runInstallSingleAction;
    }

    private createLockVersionAction(
        diagnostics: vscode.Diagnostic[],
        document: vscode.TextDocument,
        range: vscode.Range,
    ) {
        const { depInstalledVersion: installedVersion } = diagnostics[0].data!;
        const lockVersionActon = new vscode.CodeAction(
            `Lock to ${installedVersion}`,
            vscode.CodeActionKind.QuickFix,
        );
        lockVersionActon.command = {
            command: commands.replaceDocument,
            title: `Lock to ${installedVersion}`,
            arguments: [document.uri, range, `\"${installedVersion}\"`],
        };
        lockVersionActon.diagnostics = diagnostics;
        return lockVersionActon;
    }

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        _context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): Promise<vscode.CodeAction[] | undefined> {
        const codeActions: vscode.CodeAction[] = [];

        const line = range.start.line;
        const diagnostics = vscode.languages
            .getDiagnostics(document.uri)
            .filter(
                (diagnostic) =>
                    line === diagnostic.range.start.line &&
                    (diagnostic.code === DepsCheckDiagnosticCode.PACKAGE_NOT_FOUND ||
                        diagnostic.code === DepsCheckDiagnosticCode.UNMET_DEPENDENCY),
            );
        if (diagnostics.length === 0) return;

        const pm = await detectPm(vscode.workspace.getWorkspaceFolder(document.uri)!.uri);
        const cwd = vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath;

        codeActions.push(
            this.createNpmInstallAction(diagnostics, pm, cwd),
            this.createNpmInstallSingleAction(diagnostics, pm, cwd),
        );

        const unmetDepDiagnostics = diagnostics.filter(
            (diagnostic) => diagnostic.code === DepsCheckDiagnosticCode.UNMET_DEPENDENCY,
        );
        if (unmetDepDiagnostics.length > 0) {
            codeActions.push(this.createLockVersionAction(unmetDepDiagnostics, document, range));
        }

        return codeActions;
    }
}
