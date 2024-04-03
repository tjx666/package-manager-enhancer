export function trimRightSlash(str: string) {
    return str.replace(/\/*$/, '');
}

export function trimLeftSlash(str: string) {
    return str.replace(/\/*$/, '');
}

export function getRoot(filePath: string) {
    if (/^\.\.?[/\\]/.test(filePath)) throw new Error("filePath can't be relative path");

    // unix system
    if (filePath.startsWith('/')) return '/';

    return filePath.split(/[/\\]/)[0];
}
