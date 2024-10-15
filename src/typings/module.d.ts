declare module '@npmcli/config/lib/definitions' {
    export const definitions: Record<string, any>;
}

declare module 'vscode' {
    import * as vscode from 'vscode';

    export interface Diagnostic {
        data?: {
            depName?: string;
            depDeclaredVersion?: string;
            depInstalledVersion?: string;
            typesVersion?: string;
            enginesRange?: vscode.Range;
        };
    }
}
