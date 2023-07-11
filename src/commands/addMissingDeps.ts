import fs from 'node:fs/promises';
import { dirname } from 'node:path';

import * as jsonc from 'jsonc-parser';
import type { TextEditor } from 'vscode';

import { searchUsedDeps } from '../utils/searchUsedDeps';

export async function addMissingDeps(editor: TextEditor) {
    const pkgJsonPath = editor.document.fileName;
    const cwd = dirname(pkgJsonPath);
    const missingDeps = await searchUsedDeps(cwd);

    const pkgJson = editor.document.getText();
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

    // keep origin json format
    const edits = jsonc.modify(pkgJson, dependenciesNodePath, newDependencies, {
        formattingOptions: {
            tabSize: editor.options.tabSize as number,
        },
    });
    const newPkgJson = jsonc.applyEdits(pkgJson, edits);

    await fs.writeFile(pkgJsonPath, newPkgJson, 'utf8');
}
