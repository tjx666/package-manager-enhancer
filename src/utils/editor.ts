import { readFile } from 'node:fs/promises';

import type { Location, Uri } from 'vscode';
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

export function findQuote(text: string, eachNum: number, start: number, step: number) {
    const quotes = new Set(["'", '"']);
    let quoteIdx = -1;
    // 查找距离 hover 最近的 /'|"/
    while (eachNum > 0) {
        const char = text[start];
        if (quotes.has(char)) {
            quoteIdx = start;
            break;
        }
        start += step;
        eachNum--;
    }
    return quoteIdx;
}
