import { constants as FS_CONSTANTS } from 'node:fs';
import fs from 'node:fs/promises';
import { basename, dirname } from 'node:path';

export function pathExists(path: string) {
    return fs
        .access(path, FS_CONSTANTS.F_OK)
        .then(async () => {
            // check file case, /a/b/LICENSE not equals to /a/b/license
            const dir = dirname(path);
            const files = await fs.readdir(dir);
            return files.includes(basename(path));
        })
        .catch(() => false);
}
