import type { Node } from 'jsonc-parser';
import type { Location, Position, TextDocument, Uri } from 'vscode';
import vscode, { Range } from 'vscode';

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
