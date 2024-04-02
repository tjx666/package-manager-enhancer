import { readFile } from 'node:fs/promises';

import type { Node } from 'jsonc-parser';
import type { Location, TextDocument, Uri } from 'vscode';
import vscode, { Position, Range } from 'vscode';

export function goToLocation(uri: Uri, position: Position, location: Location) {
    const noResultsMessage = 'No results';
    return vscode.commands.executeCommand(
        'editor.action.goToLocations',
        uri,
        position,
        [location],
        'goto',
        noResultsMessage,
    );
}

export function jsoncStringNodeToRange(document: TextDocument, node: Node): Range {
    return new Range(
        document.positionAt(node.offset + 1),
        document.positionAt(node.offset + node.length - 1),
    );
}

export async function getFileRange(filePath: string) {
    const textContent = await readFile(filePath, 'utf8');
    const lines = textContent.split(/\r?\n/);
    const lastLine = lines.at(-1);
    return new Range(
        new Position(0, 0),
        new Position(
            Math.max(0, lines.length - 1),
            lastLine === undefined ? 0 : Math.max(0, lastLine.length - 1),
        ),
    );
}
