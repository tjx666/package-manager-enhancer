import type { CancellationToken, HoverProvider, Position, TextDocument } from 'vscode';
import { Hover } from 'vscode';

import { findQuote } from '../utils/editor';
import { findPkgInstallDir, isValidPkgName } from '../utils/pkg';
import { getPkgHoverContentsCreator } from '../utils/pkg-hover-contents';
import { getPackageInfo } from '../utils/pkg-info';

export class ModulesHoverProvider implements HoverProvider {
    async provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
    ): Promise<Hover | undefined> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return;
        }
        const hoverWord = document.getText(range);
        if (!hoverWord) {
            return;
        }

        const lineText = document.lineAt(position.line).text;
        const leftQuotaIndex = findQuote(
            lineText,
            range.start.character + 1,
            range.start.character,
            -1,
        );
        if (leftQuotaIndex === -1) {
            return;
        }
        const rightQuotaIndex = findQuote(
            lineText,
            lineText.length - range.end.character,
            range.end.character,
            1,
        );
        if (rightQuotaIndex === -1) {
            return;
        }
        const fullPkgPath = lineText.slice(leftQuotaIndex + 1, rightQuotaIndex);

        // 排除相对和绝对路径导入语句
        if (!fullPkgPath || fullPkgPath[0] === '.' || fullPkgPath[0] === '/') {
            return;
        }

        let packageName = fullPkgPath;
        const slashIndex = packageName.indexOf('/');
        if (slashIndex !== -1) {
            const isScopePkg = packageName.startsWith('@');
            if (isScopePkg) {
                const secondSlashIndex = fullPkgPath.indexOf('/', slashIndex + 1);
                if (secondSlashIndex !== -1) {
                    packageName = packageName.slice(0, secondSlashIndex);
                }
            } else {
                packageName = packageName.slice(0, slashIndex);
            }
        }

        if (!isValidPkgName(packageName)) {
            return;
        }

        const stringBeforeLeftQuote = lineText.slice(0, leftQuotaIndex);
        const stringAfterRightQuote = lineText.slice(rightQuotaIndex + 1);
        const afterFnCallRegexp = /^\s*\)(?:;.*|\n?)$/;
        const afterStatementRegexp = /^\s*(?:;.*)?$/;
        const isModule = // named imports/exports: import { pick } from 'lodash' or export * from 'antd'
            (/(?:\b|\s+)from\s+$/.test(stringBeforeLeftQuote) &&
                afterStatementRegexp.test(stringAfterRightQuote)) ||
            // unnamed import
            (/(?:\b|\s+)import\s+$/.test(stringBeforeLeftQuote) &&
                afterStatementRegexp.test(stringAfterRightQuote)) ||
            // dynamic imports: import( 'lodash'  )
            (/(?:\b|\s+)import\s*\(\s*$/.test(stringBeforeLeftQuote) &&
                afterFnCallRegexp.test(stringAfterRightQuote)) ||
            // require: require('lodash'    )
            (/require\s+\(\s*$/.test(stringBeforeLeftQuote) &&
                afterFnCallRegexp.test(stringAfterRightQuote));

        if (!isModule) return;

        const packageInfo = await getPackageInfo(packageName, {
            packageInstallDir: await findPkgInstallDir(packageName, document.uri.fsPath),
            fetchBundleSize: true,
            token,
            skipBuiltinModuleCheck: false,
        });
        if (packageInfo) {
            const pkgHoverContentsCreator = getPkgHoverContentsCreator();
            const hoverContents = pkgHoverContentsCreator.generate(packageInfo, {
                showDescription: true,
            });
            return new Hover(hoverContents);
        }

        return undefined;
    }
}
