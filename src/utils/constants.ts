export const extensionName = 'package-manager-enhancer';
const commandsArray = [
    'removeUnusedDependency',
    'showReferencesInPanel',
    'showPackageJsonDependenciesCodeLens',
    'hidePackageJsonDependenciesCodeLens',
    'runNpmScriptBackground',
] as const;

type CommandsArrayUnion = (typeof commandsArray)[number];
type Commands = {
    [P in CommandsArrayUnion]: `${typeof extensionName}.${P}`;
};
export type Command = CommandsArrayUnion extends CommandsArrayUnion
    ? `${typeof extensionName}.${CommandsArrayUnion}`
    : never;

export const commands = commandsArray.reduce((acc, item) => {
    // @ts-expect-error tsc bug
    acc[item] = `${extensionName}.${item}`;
    return acc;
}, {} as Commands);
