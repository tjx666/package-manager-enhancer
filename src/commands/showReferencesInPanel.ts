import { commands, Location, Position, Range, Uri, workspace } from 'vscode';

import { goToLocation } from '../utils/editor';
import type { SearchImportsMatch } from '../utils/searchImports';

function targetToLocation(target: string | SearchImportsMatch) {
    if (typeof target === 'string') {
        return new Location(Uri.file(target), new Range(0, 0, 0, 0));
    }

    const start = new Position(target.line, target.column);
    const end = new Position(target.line, target.column + target.importStatement.length);
    return new Location(Uri.file(target.absPath), new Range(start, end));
}

export async function showReferencesInPanel(
    uri: Uri,
    position: Position,
    targets: string[] | SearchImportsMatch[],
) {
    if (targets.length === 1) {
        const target = targets[0];
        const location = targetToLocation(target);
        const filePath = typeof target === 'string' ? target : target.absPath;
        await goToLocation(Uri.file(filePath), position, location);
        return;
    }

    const config = workspace.getConfiguration('references');
    const existingSetting = config.get('preferredLocation');
    // !: will open peek view by default
    await config.update('preferredLocation', 'view');
    try {
        await commands.executeCommand(
            'editor.action.showReferences',
            uri,
            position,
            targets.map(targetToLocation),
        );
    } finally {
        await config.update('preferredLocation', existingSetting);
    }
}
