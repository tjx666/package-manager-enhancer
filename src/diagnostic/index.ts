import { watchFile } from 'fs';
import path from 'path';

import type { ExtensionContext, TextDocument } from 'vscode';
import vscode from 'vscode';

import { EXT_NAME, pkgJsonSelector } from '../utils/constants';
import {
    DepsCheckCodeActionProvider,
    updateDepsCheckDiagnostic,
} from './DepsCheckCodeActionProvider';
import {
    updateVSCodeExtensionDiagnostic,
    VSCodeExtensionCodeActionProvider,
} from './VSCodeExtensionCodeActionProvider';

let depsCheckDiagnosticCollection: vscode.DiagnosticCollection;
let vscodeExtensionDiagnosticCollection: vscode.DiagnosticCollection;

export function registerCodeActionsProviders(context: ExtensionContext) {
    const { subscriptions } = context;

    depsCheckDiagnosticCollection = vscode.languages.createDiagnosticCollection(
        `${EXT_NAME}:depsVersionCheck`,
    );
    vscodeExtensionDiagnosticCollection = vscode.languages.createDiagnosticCollection(
        `${EXT_NAME}:vscodeExtensionCheck`,
    );

    const refreshDiagnostics = (document: TextDocument) => {
        updateDepsCheckDiagnostic(depsCheckDiagnosticCollection, document);
        updateVSCodeExtensionDiagnostic(vscodeExtensionDiagnosticCollection, document);
    };

    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document);
    }

    subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                refreshDiagnostics(editor.document);
            }
        }),

        vscode.workspace.onDidChangeTextDocument((e) => refreshDiagnostics(e.document)),

        vscode.workspace.onDidCloseTextDocument((doc) => {
            depsCheckDiagnosticCollection.delete(doc.uri);
            vscodeExtensionDiagnosticCollection.delete(doc.uri);
        }),
    );

    const filesToWatch = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb'].map(
        (file) => path.resolve(vscode.workspace.workspaceFolders![0].uri.fsPath, file),
    );
    const watchers = filesToWatch.map((file) => {
        const watcher = watchFile(file, () => {
            for (const editor of vscode.window.visibleTextEditors) {
                updateDepsCheckDiagnostic(depsCheckDiagnosticCollection, editor.document);
            }
        });
        return watcher;
    });
    subscriptions.push({
        dispose() {
            for (const watcher of watchers) {
                watcher.removeAllListeners();
            }
        },
    });

    subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            pkgJsonSelector,
            new DepsCheckCodeActionProvider(),
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            },
        ),
        vscode.languages.registerCodeActionsProvider(
            pkgJsonSelector,
            new VSCodeExtensionCodeActionProvider(),
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            },
        ),
    );
}

export function disposeCodeActionsProviders() {
    depsCheckDiagnosticCollection.dispose();
    vscodeExtensionDiagnosticCollection.dispose();
}
