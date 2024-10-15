import * as path from 'node:path';

import semver from 'semver';
import * as vscode from 'vscode';

import { logger } from '../logger';
import { EXT_NAME, PACKAGE_JSON } from '../utils/constants';

enum VSCodeExtensionDiagnosticCode {
    VSCODE_VERSION_MISMATCH = `${EXT_NAME}.vscodeVersionMismatch`,
    ACTIVATION_EVENTS_WILDCARD = `${EXT_NAME}.activationEventsWildcard`,
}

// Add this type definition
interface VSCodeVersionMismatchData {
    typesVersion: string;
    enginesRange: vscode.Range;
}

export const vscodeExtensionDiagnosticCollection = vscode.languages.createDiagnosticCollection(
    `${EXT_NAME}:vscodeExtensionCheck`,
);

export async function updateVSCodeExtensionDiagnostic(document: vscode.TextDocument) {
    if (
        !path.basename(document.uri.fsPath).includes(PACKAGE_JSON) ||
        document.languageId !== 'json'
    )
        return;

    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    try {
        const { getLocation, getParsedByString } = await import('jsonpos');
        const parsed = getParsedByString(text);

        // Check engines.vscode version
        const enginesVSCodeVersion = parsed.json?.engines?.vscode;
        const vscodeTypesVersion = parsed.json?.devDependencies?.['@types/vscode'];

        if (enginesVSCodeVersion && vscodeTypesVersion) {
            const enginesLocation = getLocation(parsed, { path: ['engines', 'vscode'] });
            const typesLocation = getLocation(parsed, {
                path: ['devDependencies', '@types/vscode'],
            });

            if (enginesLocation.start && typesLocation.start) {
                const enginesRange = new vscode.Range(
                    enginesLocation.start.line - 1,
                    enginesLocation.start.column - 1,
                    enginesLocation.end!.line - 1,
                    enginesLocation.end!.column - 1,
                );

                const cleanEnginesVersion = semver.coerce(enginesVSCodeVersion)?.version;
                const cleanTypesVersion = semver.coerce(vscodeTypesVersion)?.version;

                if (
                    cleanEnginesVersion &&
                    cleanTypesVersion &&
                    semver.lt(cleanEnginesVersion, cleanTypesVersion)
                ) {
                    const diagnostic = new vscode.Diagnostic(
                        enginesRange,
                        `@types/vscode version (${cleanTypesVersion}) is higher than engines.vscode version (${cleanEnginesVersion})`,
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = VSCodeExtensionDiagnosticCode.VSCODE_VERSION_MISMATCH;
                    diagnostic.data = {
                        typesVersion: cleanTypesVersion,
                        enginesRange,
                    } as VSCodeVersionMismatchData;
                    diagnostics.push(diagnostic);
                }
            }
        }

        // Check activationEvents
        const activationEvents = parsed.json?.activationEvents;
        if (Array.isArray(activationEvents) && activationEvents.includes('*')) {
            const activationEventsLocation = getLocation(parsed, { path: ['activationEvents'] });
            if (activationEventsLocation.start) {
                const starIndex = activationEvents.indexOf('*');
                const starLocation = getLocation(parsed, { path: ['activationEvents', starIndex] });
                if (starLocation.start && starLocation.end) {
                    const starRange = new vscode.Range(
                        starLocation.start.line - 1,
                        starLocation.start.column - 1,
                        starLocation.end.line - 1,
                        starLocation.end.column - 1,
                    );

                    const diagnostic = new vscode.Diagnostic(
                        starRange,
                        'Using "*" in activationEvents is not recommended. Consider using "onStartupFinished" instead.',
                        vscode.DiagnosticSeverity.Warning,
                    );
                    diagnostic.code = VSCodeExtensionDiagnosticCode.ACTIVATION_EVENTS_WILDCARD;
                    diagnostics.push(diagnostic);
                }
            }
        }

        vscodeExtensionDiagnosticCollection.set(document.uri, diagnostics);
    } catch (error: any) {
        logger.error(error);
    }
}

export class VSCodeExtensionCodeActionProvider implements vscode.CodeActionProvider {
    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): Promise<vscode.CodeAction[]> {
        const codeActions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.code === VSCodeExtensionDiagnosticCode.VSCODE_VERSION_MISMATCH) {
                const action = new vscode.CodeAction(
                    'Update engines.vscode version',
                    vscode.CodeActionKind.QuickFix,
                );
                if (
                    diagnostic.data &&
                    'enginesRange' in diagnostic.data &&
                    'typesVersion' in diagnostic.data
                ) {
                    action.command = {
                        command: 'package-manager-enhancer.replaceDocument',
                        title: 'Update engines.vscode version',
                        arguments: [
                            document.uri,
                            diagnostic.data.enginesRange,
                            `"^${diagnostic.data.typesVersion}"`,
                        ],
                    };
                    action.diagnostics = [diagnostic];
                    action.isPreferred = true;
                    codeActions.push(action);
                }
            } else if (
                diagnostic.code === VSCodeExtensionDiagnosticCode.ACTIVATION_EVENTS_WILDCARD
            ) {
                const action = new vscode.CodeAction(
                    'Replace "*" with "onStartupFinished"',
                    vscode.CodeActionKind.QuickFix,
                );
                action.command = {
                    command: 'package-manager-enhancer.replaceDocument',
                    title: 'Replace "*" with "onStartupFinished"',
                    arguments: [document.uri, diagnostic.range, '"onStartupFinished"'],
                };
                action.diagnostics = [diagnostic];
                action.isPreferred = true;
                codeActions.push(action);
            }
        }

        return codeActions;
    }
}

export async function replaceDocument(uri: vscode.Uri, range: vscode.Range, newText: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, range, newText);
    await vscode.workspace.applyEdit(edit);
}
