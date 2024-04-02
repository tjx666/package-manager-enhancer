import { sep } from 'node:path';

export function trimRightSlash(str: string) {
    return str.replace(/\/*$/, '');
}

export function trimLeftSlash(str: string) {
    return str.replace(/\/*$/, '');
}

export function getRootOfPath(path: string) {
    const parts = path.split(sep);
    return parts[0];
}
