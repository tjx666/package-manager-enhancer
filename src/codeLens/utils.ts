import type { CodeLens, Position, TextDocument } from 'vscode';

export interface CodeLensDataItem {
    type: 'all' | 'include' | 'exclude';
    position: Position;
    getReferenceFilesPromise: Promise<string[]>;
}
export type CodeLensData = Map<CodeLens, CodeLensDataItem>;

export async function resolveReferencesCodeLens(
    codeLens: CodeLens,
    codeLensData: CodeLensData,
    document: TextDocument,
): Promise<CodeLens | undefined> {
    const data = codeLensData.get(codeLens);
    if (!data) return;

    const referencedFiles = await data.getReferenceFilesPromise;
    const packagesCount = referencedFiles.length;
    const title = (data.type === 'exclude' ? '- ' : '') + packagesCount;

    return {
        ...codeLens,
        command: {
            title,
            command: 'package-manager-enhancer.showReferencesInPanel',
            arguments: [document!.uri, data.position, referencedFiles],
        },
    };
}
