import { dirname } from 'node:path';

import type { Node } from 'jsonc-parser';
import type { CancellationToken, HoverProvider, Position, TextDocument } from 'vscode';
import { Range, MarkdownString, Hover, window } from 'vscode';

import { commands } from '../utils/constants';

export class NpmScriptsHoverProvider implements HoverProvider {
    async provideHover(
        document: TextDocument,
        position: Position,
        _token: CancellationToken,
    ): Promise<Hover | undefined> {
        const filePath = document.uri.fsPath;
        const packageJson = document.getText();

        const { parseTree, findNodeAtOffset, findNodeAtLocation } = await import('jsonc-parser');
        let root: Node | undefined;
        try {
            root = parseTree(packageJson);
        } catch (error) {
            console.error(error);
            window.showErrorMessage(`parse ${filePath} failed!`);
        }
        if (!root) return;

        const scriptNameNode = findNodeAtOffset(root, document.offsetAt(position));
        const scriptsNode = findNodeAtLocation(root, ['scripts']);
        const hoverOverScriptName =
            scriptNameNode?.type === 'string' &&
            scriptNameNode.parent?.type === 'property' &&
            scriptNameNode === scriptNameNode.parent.children?.[0] &&
            scriptNameNode.parent.parent === scriptsNode;
        if (!hoverOverScriptName) return;

        const scriptName = scriptNameNode.value;
        const script = `npm run ${scriptName}`;
        const args = encodeURI(
            JSON.stringify({
                scriptName,
                script,
                cwd: dirname(filePath),
            }),
        );
        const commandUrl = `command:${commands.runNpmScriptBackground}?${args}`;
        const link = `<a title="${script}" href="${commandUrl}">Run Background</a>`;
        const markdownStr = new MarkdownString(link);
        markdownStr.isTrusted = true;
        markdownStr.supportHtml = true;
        const range = new Range(
            document.positionAt(scriptNameNode.offset),
            document.positionAt(scriptNameNode.offset + scriptName.length),
        );
        const hover = new Hover(markdownStr, range);
        return hover;
    }
}
