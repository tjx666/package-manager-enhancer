import { dirname } from 'node:path';

import type { TextEditor } from 'vscode';
import { Range } from 'vscode';

import { parseJsonc } from '../utils/jsonc';
import { getPkgInfoFromNpmView } from '../utils/pkg';
import { searchUsedDeps } from '../utils/searchUsedDeps';

export async function addMissingDeps(editor: TextEditor) {
    const { findNodeAtLocation, getNodeValue, modify } = await import('jsonc-parser');
    const { document } = editor;

    const pkgJsonPath = document.fileName;
    const cwd = dirname(pkgJsonPath);
    const missingDeps = await searchUsedDeps(cwd);

    const pkgJson = document.getText();
    const root = await parseJsonc(pkgJson)!;
    if (!root) return;

    const dependenciesNodePath = ['dependencies'];
    const dependenciesNode = findNodeAtLocation(root, dependenciesNodePath);
    const dependencies = dependenciesNode ? getNodeValue(dependenciesNode) : {};
    const missingDepsObj = missingDeps.reduce(
        (obj, packageName) => {
            if (packageName in dependencies) return obj;

            obj[packageName] = '';
            return obj;
        },
        {} as Record<string, string>,
    );
    Object.assign(dependencies, missingDepsObj);

    // sort keys alphabetically
    const newDependencies: Record<string, string> = {};
    for (const key of Object.keys(dependencies).sort()) {
        newDependencies[key] = dependencies[key];
    }

    const getVersionPromises = Object.keys(newDependencies).map(async (packageName) => {
        const properties = ['version'] as const;
        const version = await getPkgInfoFromNpmView<string, typeof properties>(
            packageName,
            properties,
            cwd,
        );
        if (version) {
            newDependencies[packageName] = version;
        }
    });
    await Promise.all(getVersionPromises);

    // keep origin json format
    const edits = modify(pkgJson, dependenciesNodePath, newDependencies, {
        formattingOptions: {
            tabSize: editor.options.tabSize as number,
        },
    });

    return editor.edit((editBuilder) => {
        for (const edit of edits) {
            const range = new Range(
                document.positionAt(edit.offset),
                document.positionAt(edit.offset + edit.length),
            );
            editBuilder.replace(range, edit.content);
        }
    });
}
