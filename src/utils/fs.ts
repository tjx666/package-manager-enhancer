import { constants as FS_CONSTANTS } from 'node:fs';
import fs from 'node:fs/promises';
import { basename, dirname } from 'node:path';

import type { JsonValue } from 'type-fest';

/**
 * Check given path whether exits, case sensitive
 */
export function pathExists(path: string) {
    return fs
        .access(path, FS_CONSTANTS.F_OK)
        .then(async () => {
            // check file case, /a/b/LICENSE not equals to /a/b/license
            const dir = dirname(path);
            const fileNames = await fs.readdir(dir);
            return fileNames.includes(basename(path));
        })
        .catch(() => false);
}

export async function isFile(path: string): Promise<boolean> {
    try {
        return (await fs.stat(path)).isFile();
    } catch {
        return false;
    }
}

export async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await fs.stat(path)).isDirectory();
    } catch {
        return false;
    }
}

export async function readJsonFile<T extends JsonValue>(jsonPath: string): Promise<T | undefined> {
    try {
        const json = await fs.readFile(jsonPath, 'utf8');
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

export function formatSize(byteSize: number, decimal = 2): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    for (; i < units.length; i++) {
        if (byteSize < 1024) {
            break;
        }
        byteSize /= 1024;
    }
    return byteSize.toFixed(decimal) + units[i];
}
