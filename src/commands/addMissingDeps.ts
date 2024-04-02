import { dirname } from 'node:path';

import * as jsonc from 'jsonc-parser';
import type { TextEditor } from 'vscode';
import { Range } from 'vscode';

import { getPackageInfoFromNpmView } from '../utils/pkg';
import { searchUsedDeps } from '../utils/searchUsedDeps';

export async function addMissingDeps(editor: TextEditor) {
    const { document } = editor;

    const pkgJsonPath = document.fileName;
    const cwd = dirname(pkgJsonPath);
    const missingDeps = await searchUsedDeps(cwd);

    const pkgJson = document.getText();
    const root = jsonc.parseTree(pkgJson)!;
    const dependenciesNodePath = ['dependencies'];
    const dependenciesNode = jsonc.findNodeAtLocation(root, dependenciesNodePath);
    const dependencies = dependenciesNode ? jsonc.getNodeValue(dependenciesNode) : {};
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
        const version = await getPackageInfoFromNpmView<string, typeof properties>(
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
    const edits = jsonc.modify(pkgJson, dependenciesNodePath, newDependencies, {
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
