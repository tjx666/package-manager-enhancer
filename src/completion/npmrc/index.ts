// @ts-expect-error missing types
import { definitions } from '@npmcli/config/lib/definitions';
import { types } from '@pnpm/config';
import type { CompletionItemProvider } from 'vscode';
import vscode from 'vscode';

import { options } from './options';

export class NpmrcCompletionItemProvider implements CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext,
    ): vscode.ProviderResult<
        vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
    > {
        const char = position.character;
        const lineBefore = document.lineAt(position).text.slice(0, char);

        if (lineBefore.endsWith('=')) {
            const key = lineBefore.slice(0, -1);
            if (!options.has(key)) {
                return;
            }
            const availableValues = types[key as keyof typeof types] ?? definitions[key]?.type;
            if (availableValues) {
                const isBoolean =
                    typeof availableValues === 'function' && availableValues.name === 'Boolean';

                if (isBoolean) {
                    return {
                        items: [
                            new vscode.CompletionItem('true', vscode.CompletionItemKind.Value),
                            new vscode.CompletionItem('false', vscode.CompletionItemKind.Value),
                        ],
                    };
                }

                const values = Array.isArray(availableValues) ? availableValues : [availableValues];
                const items = values
                    .filter((value) => typeof value === 'string')
                    .map((value) => {
                        const item = new vscode.CompletionItem(
                            value,
                            vscode.CompletionItemKind.Value,
                        );
                        item.insertText = value;
                        return item;
                    });
                return { items };
            }
            return;
        }

        return {
            items: Array.from(options).map(
                (key) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Property),
            ),
        };
    }

    resolveCompletionItem?(
        item: vscode.CompletionItem,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CompletionItem> {
        if (item.kind !== vscode.CompletionItemKind.Property) {
            return item;
        }

        const key = item.label;
        const type = types[key as keyof typeof types] ?? definitions[key]?.type;
        const availableValueTypes = type
            ? (Array.isArray(type) ? type : [type])
                  .map((value) =>
                      typeof value === 'string'
                          ? value
                          : typeof value === 'function'
                            ? value.name
                            : String(value),
                  )
                  .filter((value) => value !== '[object Object]')
            : [];
        const availableValueTypesString =
            availableValueTypes.length > 0 ? `\n\nType: ${availableValueTypes.join(' | ')}` : '';
        const description = definitions[key]?.description;
        if (description) {
            item.documentation = new vscode.MarkdownString(
                description
                    .replaceAll('\\`', '`')
                    .split('\n')
                    .map((line: string) => line.trim())
                    .join('\n')
                    .concat(
                        `\n\n[npm .npmrc documentation](https://docs.npmjs.com/cli/v10/using-npm/config#${key})`,
                    )
                    .concat(availableValueTypesString),
            );
        } else {
            item.documentation = new vscode.MarkdownString(
                `[pnpm .npmrc documentation](https://pnpm.io/npmrc#${key})`.concat(
                    availableValueTypesString,
                ),
            );
        }
        item.insertText = `${key}=`;
        return item;
    }
}
