import type { Uri, Position, Location } from 'vscode';
import vscode from 'vscode';

export function goToLocations(uri: Uri, position: Position, location: Location) {
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
