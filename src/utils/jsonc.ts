import type { Node } from 'jsonc-parser';
import type { TextDocument } from 'vscode';
import { Range } from 'vscode';

export async function parseJsonc(json: string) {
    const jsoncParser = await import('jsonc-parser');
    let root: Node | undefined;
    try {
        root = jsoncParser.parseTree(json);
    } catch {
        return;
    }
    return root;
}

export function jsoncStringNodeToRange(document: TextDocument, node: Node): Range {
    return new Range(
        document.positionAt(node.offset + 1),
        document.positionAt(node.offset + node.length - 1),
    );
}
