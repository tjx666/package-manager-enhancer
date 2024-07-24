import fs from 'node:fs/promises';
import path from 'node:path';

import type { ParsedJson } from 'jsonpos';
import semver from 'semver';
import type { CodeActionProvider } from 'vscode';
import vscode from 'vscode';

import { configuration } from '../configuration';
import { logger } from '../logger';
import { commands, PACKAGE_JSON } from '../utils/constants';
import { findPkgInstallDir } from '../utils/pkg';
import { getPackageInfo } from '../utils/pkg-info';
import { detectPm } from '../utils/pm';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    'package-manager-enhancer:depsVersionCheck',
);

export async function updateDiagnostic(document: vscode.TextDocument) {
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
                if (typeof version !== 'string') return;

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

                    const targetUri = await fs
                        .realpath(path.resolve(packageInstallDir!, PACKAGE_JSON))
                        .then((p) => vscode.Uri.file(p));
                    let versionRange: vscode.Range | undefined;
                    try {
                        const installedParsed = getParsedByString(
                            await fs.readFile(targetUri.fsPath, 'utf8'),
                        );
                        const versionLocation = getLocation(installedParsed, {
                            path: ['version'],
                        });
                        if (!versionLocation.start || !versionLocation.end) return;
                        versionRange = new vscode.Range(
                            versionLocation.start.line - 1,
                            versionLocation.start.column - 1,
                            versionLocation.end.line - 1,
                            versionLocation.end.column - 1,
                        );
                    } catch (error: any) {
                        logger.error(error);
                    }
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(
                                targetUri,
                                versionRange ?? new vscode.Range(0, 0, 0, 0),
                            ),
                            `${name}@${version}`,
                        ),
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(document.uri, range),
                            `${installedVersion}`,
                        ),
                    ];

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
    async provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        _context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): Promise<vscode.CodeAction[] | undefined> {
        const diagnostics = vscode.languages
            .getDiagnostics(document.uri)
            .filter(
                (diagnostic) =>
                    diagnostic.code === 'package-manager-enhancer.packageNotFound' ||
                    diagnostic.code === 'package-manager-enhancer.unmetDependency',
            );
        if (diagnostics.length === 0) return;

        const pm = await detectPm(vscode.workspace.getWorkspaceFolder(document.uri)!.uri);

        const runInstall = new vscode.CodeAction(
            `Run "${pm} install"`,
            vscode.CodeActionKind.QuickFix,
        );
        runInstall.command = {
            command: commands.runNpmScriptInTerminal,
            title: `Run ${pm} install`,
            arguments: [
                {
                    command: 'install',
                    cwd: vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath,
                },
            ],
        };
        runInstall.diagnostics = diagnostics;

        const packageNameAndVersion = diagnostics[0].relatedInformation![0].message;

        const runInstallSingleTitle = `Run "${pm} install ${packageNameAndVersion}"`;
        const runInstallSingle = new vscode.CodeAction(
            runInstallSingleTitle,
            vscode.CodeActionKind.QuickFix,
        );
        runInstallSingle.command = {
            command: commands.runNpmScriptInTerminal,
            title: runInstallSingleTitle,
            arguments: [
                {
                    command: `install ${packageNameAndVersion}`,
                    cwd: vscode.workspace.getWorkspaceFolder(document.uri)!.uri.fsPath,
                },
            ],
        };
        runInstallSingle.diagnostics = diagnostics;

        const installedVersion = diagnostics[0].relatedInformation![1].message;
        const fallbackVersion = new vscode.CodeAction(
            `Lock to ${installedVersion}`,
            vscode.CodeActionKind.QuickFix,
        );
        fallbackVersion.command = {
            command: commands.keepInstalledVersion,
            title: `Lock to ${installedVersion}`,
            arguments: [
                {
                    versionRange: _range,
                    installedVersion: `\"${installedVersion}\"`,
                },
            ],
        };
        fallbackVersion.diagnostics = diagnostics;

        return [runInstall, runInstallSingle, fallbackVersion];
    }
}
