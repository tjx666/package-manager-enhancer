import type { OutputChannel } from 'vscode';
import vscode from 'vscode';

class Logger {
    channel: OutputChannel | undefined;

    constructor(private name: string, private language: string) {}

    output(message: string, active: boolean, level: string): void {
        if (this.channel === undefined) {
            const prefix = 'Package Manager Enhancer';
            this.channel = vscode.window.createOutputChannel(
                `${prefix} ${this.name}`.trim(),
                this.language,
            );
        }
        this.channel.append(`[${level}] ${message}\n`);
        if (active) {
            this.channel.show();
        }
    }

    info(message: string, active = false) {
        this.output(message, active, 'INFO');
    }

    error(message: string, active = false) {
        this.output(message, active, 'ERROR');
    }

    dispose(): void {
        this.channel?.dispose();
    }
}

export const logger = new Logger('', 'log');
