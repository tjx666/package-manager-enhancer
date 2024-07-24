declare module '@npmcli/config/lib/definitions' {
    export const definitions: Record<string, any>;
}

import * as vscode from 'vscode';

declare module 'vscode' {
    export interface Diagnostic {
        data?: {
            depName?: string;
            depDeclaredVersion?: string;
            depInstalledVersion?: string;
        };
    }
}
