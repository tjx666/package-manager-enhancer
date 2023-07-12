import { execa } from 'execa';
import type { JsonValue } from 'type-fest';

/**
 * ref: [vscode builtin npm extension npmView implementation](https://github.com/microsoft/vscode/blob/main/extensions/npm/src/features/packageJSONContribution.ts#L285)
 */
export async function getPackageInfo<
    V extends JsonValue,
    const PA extends readonly string[] = readonly string[],
>(
    packageName: string,
    properties: PA,
    cwd: string,
): Promise<
    | (PA['length'] extends 1
          ? V
          : {
                [K in PA[number]]: V;
            })
    | undefined
> {
    try {
        const { stdout } = await execa('npm', ['view', '--json', packageName, ...properties], {
            cwd,
        });
        return JSON.parse(stdout);
    } catch {
        return undefined;
    }
}
