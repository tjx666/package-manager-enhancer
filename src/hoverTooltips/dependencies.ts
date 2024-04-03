import type { CancellationToken, HoverProvider, Position, TextDocument } from 'vscode';
import { Hover } from 'vscode';

import { findPkgInstallDir, getPkgNameAndVersionFromDocPosition } from '../utils/pkg';
import { getPkgHoverContentsCreator } from '../utils/pkg-hover-contents';
import { getPackageInfo } from '../utils/pkg-info';

export class DependenciesHoverProvider implements HoverProvider {
    async provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
    ): Promise<Hover | undefined> {
        const pkgNameAndVersion = await getPkgNameAndVersionFromDocPosition(document, position);
        if (!pkgNameAndVersion) return;

        const { name, version } = pkgNameAndVersion;
        const info = await getPackageInfo(name, {
            packageInstallDir: await findPkgInstallDir(name, document.uri.fsPath),
            searchVersionRange: version,
            fetchBundleSize: true,
            remoteFetch: true,
            // Note: 当 package.json 中定义了依赖类似 "path" 这样与 node 内置模块相同名称的包时，永远认为他不是使用 node 内置模块
            skipBuiltinModuleCheck: true,
            token,
        });
        if (!info) return;

        const pkgHoverContentsCreator = getPkgHoverContentsCreator();
        const hoverContents = pkgHoverContentsCreator.generate(info);
        return new Hover(hoverContents);
    }
}
