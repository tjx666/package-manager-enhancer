import vscode, { Position, Range } from 'vscode';

export function deleteLine(line: number) {
    const editor = vscode.window.activeTextEditor;
    editor?.edit((editBuilder) => {
        const { document } = editor;
        const lineRange = document.lineAt(line).range;
        const start = lineRange.start;
        const aboveLineEnd = new Position(start.line - 1, document.lineAt(line - 1).text.length);
        editBuilder.delete(new Range(aboveLineEnd, lineRange.end));
    });
}
