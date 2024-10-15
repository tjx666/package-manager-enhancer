import type vscode from 'vscode';

export const EXT_NAME = 'package-manager-enhancer';
const commandsArray = [
    'removeUnusedDependency',
    'showReferencesInPanel',
    'showPackageJsonDependenciesCodeLens',
    'hidePackageJsonDependenciesCodeLens',
    'runNpmScriptBackground',
    'runNpmScriptInTerminal',
    'addMissingDeps',
    'findNpmPackage',
    'findPathInNodeModules',
    'replaceDocument',
] as const;

type CommandsArrayUnion = (typeof commandsArray)[number];
type Commands = {
    [P in CommandsArrayUnion]: `${typeof EXT_NAME}.${P}`;
};
export type Command = CommandsArrayUnion extends CommandsArrayUnion
    ? `${typeof EXT_NAME}.${CommandsArrayUnion}`
    : never;

export const commands = commandsArray.reduce((acc, item) => {
    // @ts-expect-error tsc bug
    acc[item] = `${EXT_NAME}.${item}`;
    return acc;
}, {} as Commands);

export const NODE_MODULES = 'node_modules';
export const PACKAGE_JSON = 'package.json';

export const pkgJsonSelector: vscode.DocumentSelector = {
    language: 'json',
    scheme: 'file',
    pattern: '**/package.json',
};

export const npmrcSelector: vscode.DocumentSelector = {
    language: 'properties',
    scheme: 'file',
    pattern: '**/.npmrc',
};
