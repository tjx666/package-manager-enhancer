import { access, readdir, stat } from 'fs/promises';
import { basename, join } from 'path';
import validate = require('validate-npm-package-name');
import type { Uri } from 'vscode';
import { window, workspace } from 'vscode';

import { logger } from '../logger';
import { NODE_MODULES, PACKAGE_JSON } from '../utils/constants';
import { getWorkspaceFolderPathByPath, showPickWorkspaceFolder } from '../utils/window';

export async function searchPackage(uri: Uri) {
    // package.json 中 menus 已经限定目录名为 node_modules 才触发该命令，所以 uri.path 存在必定是 node_modulesPath
    let node_modulesPath = uri ? uri.path : '';

    if (!node_modulesPath) {
        let projectRootPath: string;
        try {
            projectRootPath = await showPickWorkspaceFolder();
            if (!projectRootPath) {
                window.showErrorMessage('Please select the node_modules project to search');
                return;
            }
        } catch {
            projectRootPath = '';
            window.showErrorMessage('The current workspace does not have an open project');
            return;
        }
        node_modulesPath = join(projectRootPath, NODE_MODULES);
    }

    if (node_modulesPath) {
        await searchNodeModules(node_modulesPath);
    }
}

async function getNodeModulesPkgNameList(node_modulesPath: string) {
    try {
        const files = await readdir(node_modulesPath);
        // 处理 @开头的 package
        const organizePkgList: string[] = [];
        const pkgList: string[] = [];
        files.forEach((filename) => {
            if (filename.startsWith('@')) {
                organizePkgList.push(filename);
            } else if (validate(filename).validForOldPackages) {
                pkgList.push(filename);
            }
        });

        const resultList = await Promise.allSettled(
            organizePkgList.map((filename) => {
                return readdir(join(node_modulesPath, filename));
            }),
        );

        let fullOrganizePkgList: string[] = [];
        resultList.forEach((result, idx) => {
            if (result.status === 'rejected') {
                return;
            }
            const _files = result.value;
            if (Array.isArray(_files)) {
                const organizeName = organizePkgList[idx];
                const fullOrganizePkgNameList = _files.map((filename) => {
                    return `${organizeName}/${filename}`;
                });
                fullOrganizePkgList = fullOrganizePkgList.concat(fullOrganizePkgNameList);
            }
        });

        // node_modules 完整 packageName 列表
        const fullPkgNameList = fullOrganizePkgList.concat(pkgList);
        return fullPkgNameList;
    } catch (error: any) {
        logger.error(`读取${node_modulesPath}目录失败\n${error.message}`);
        return [] as string[];
    }
}

async function searchNodeModules(node_modulesPath: string) {
    const promises = [getNodeModulesPkgNameList(node_modulesPath)];

    const pnpmOtherPkgNode_modules = join(node_modulesPath, '.pnpm', 'node_modules');
    try {
        await access(pnpmOtherPkgNode_modules);
        promises.push(getNodeModulesPkgNameList(pnpmOtherPkgNode_modules));
    } catch {}

    const results = await Promise.allSettled(promises);

    const fullPkgNameList = results.flatMap((item) => {
        if (item.status === 'rejected') {
            return [];
        }
        return item.value;
    });

    const wsFolderPath = getWorkspaceFolderPathByPath(node_modulesPath);
    const projectName = basename(wsFolderPath!);
    // 用户选择结果
    const pickResult = await window.showQuickPick(fullPkgNameList, {
        placeHolder: join(projectName, NODE_MODULES),
    });
    if (pickResult) {
        let userPickPath = join(node_modulesPath, pickResult);
        try {
            await access(userPickPath);
        } catch {
            try {
                userPickPath = join(pnpmOtherPkgNode_modules, pickResult);
                await access(userPickPath);
            } catch (error: any) {
                logger.error(`路径不存在:${userPickPath}${error.message}`);
            }
        }

        const pkgJsonPath = join(userPickPath, PACKAGE_JSON);
        let isPkg = false;
        try {
            await access(pkgJsonPath);
            isPkg = true;
        } catch {}

        let destPath = '';
        if (!isPkg) {
            // 不是 package, 是类似：.bin 文件夹或普通文件
            const _stat = await stat(userPickPath);
            if (_stat.isFile()) {
                destPath = userPickPath;
            } else {
                // 遍历文件列表，打开最前面的文件
                const files = await readdir(userPickPath);
                let i = 0;
                while (i < files.length) {
                    // 判断防止全是文件夹的情况
                    const filePath = join(userPickPath, files[i++]);
                    // eslint-disable-next-line no-await-in-loop
                    const _stat = await stat(filePath);
                    if (_stat.isFile()) {
                        destPath = filePath;
                        break;
                    }
                }
            }
        } else {
            destPath = pkgJsonPath;
        }

        if (destPath) {
            const doc = await workspace.openTextDocument(destPath);
            window.showTextDocument(doc);
        }
    }
}
