import vscode, { Position, Range } from 'vscode';

export function removeUnusedDependency(lineNum: number) {
    const editor = vscode.window.activeTextEditor;
    editor?.edit((editBuilder) => {
        const { document } = editor;
        const line = document.lineAt(lineNum);
        const lineRange = line.range;
        const aboveLineNum = lineNum - 1;
        const aboveTLineText = document.lineAt(aboveLineNum).text;
        const isLastDependency = !line.text.trimEnd().endsWith(',');
        const aboveLineLastNoneWhiteSpaceCharIndex = aboveTLineText.trimEnd().length;
        const aboveLineEnd = new Position(
            aboveLineNum,
            isLastDependency
                ? aboveLineLastNoneWhiteSpaceCharIndex - 1
                : aboveLineLastNoneWhiteSpaceCharIndex,
        );
        editBuilder.delete(new Range(aboveLineEnd, lineRange.end));
    });
}
