import { join } from 'node:path';

import hostedGitInfo from 'hosted-git-info';
import { isObject } from 'lodash-es';
import { env, MarkdownString, Uri } from 'vscode';

import { spacing } from '.';
import { PACKAGE_JSON } from './constants';
import { formatSize } from './fs';
import { trimLeftSlash } from './path';
import type { PackageInfo } from './pkg-info';

function tryGetUrl(val: string | { url?: string | undefined } | undefined) {
    if (typeof val === 'string') {
        return val;
    } else if (isObject(val) && typeof val.url === 'string') {
        return val.url;
    }
    return undefined;
}

function getPkgNameAndVersion(packageInfo: PackageInfo) {
    return (
        packageInfo.name +
        ((packageInfo as any).installedVersion ? `@${(packageInfo as any).installedVersion}` : '')
    );
}

function extractGitUrl(url: string) {
    let result: string | undefined;
    if (/^https?:\/\/.*/i.test(url)) {
        result = url;
    } else {
        const gitInfo = hostedGitInfo.fromUrl(trimLeftSlash(url));
        if (gitInfo) {
            result = gitInfo.https({ noGitPlus: true, noCommittish: true });
        }
    }
    if (result) result = result.replace(/\.git$/, '');
    return result;
}

class PkgHoverContentsCreator {
    packageInfo!: PackageInfo;

    get pkgName() {
        const packageInfo = this.packageInfo;

        let packageName: string, showTextDocumentCmdUri: Uri | undefined;
        if (packageInfo.isBuiltinModule) {
            packageName = packageInfo.name;
        } else {
            packageName = getPkgNameAndVersion(packageInfo);
            const pkgJsonPath =
                packageInfo.installDir && join(packageInfo.installDir, PACKAGE_JSON);
            if (pkgJsonPath) {
                // command uri: https://liiked.github.io/VS-Code-Extension-Doc-ZH/#/extension-guides/command?id=%e5%91%bd%e4%bb%a4%e7%9a%84urls
                showTextDocumentCmdUri = Uri.parse(
                    `command:extension.show.textDocument?${encodeURIComponent(`"${pkgJsonPath}"`)}`,
                );
            }
        }

        let result = `\`${packageName}\``;
        if (showTextDocumentCmdUri) {
            result = `[${result}](${showTextDocumentCmdUri})`;
        }
        result = `<span style="color:#569CD6;">${result}</span>`;
        return result;
    }

    get pkgUrl() {
        const packageInfo = this.packageInfo;

        let homepageUrl: string | undefined,
            repositoryUrl: string | undefined,
            npmUrl: string | undefined;
        if (packageInfo.isBuiltinModule) {
            homepageUrl = `https://nodejs.org/${env.language}/`;
            repositoryUrl = 'https://github.com/nodejs/node';
        } else {
            homepageUrl = tryGetUrl(packageInfo.packageJson.homepage);
            repositoryUrl = tryGetUrl(packageInfo.packageJson.repository);

            if (repositoryUrl) {
                repositoryUrl = extractGitUrl(repositoryUrl);
            }

            if (!repositoryUrl) {
                let bugsUrl = tryGetUrl(packageInfo.packageJson.bugs);
                if (bugsUrl) {
                    const idx = bugsUrl.indexOf('/issues');
                    if (idx !== -1) {
                        bugsUrl = bugsUrl.slice(0, idx);
                    }
                    repositoryUrl = extractGitUrl(bugsUrl);
                }
            }

            if (repositoryUrl === homepageUrl) {
                homepageUrl = undefined;
            }

            npmUrl = `https://www.npmjs.com/package/${packageInfo.name}${
                packageInfo.installedVersion ? `/v/${packageInfo.installedVersion}` : ''
            }`;
        }

        let result = '';
        if (npmUrl) {
            result += `[NPM](${npmUrl})${spacing(4)}`;
        }
        if (homepageUrl) {
            result += `[HomePage](${homepageUrl})${spacing(4)}`;
        }
        if (repositoryUrl) {
            result += `[Repository](${repositoryUrl})${spacing(4)}`;
        }
        return result;
    }

    get bundleSize() {
        const packageInfo = this.packageInfo;

        let result = '';
        if (!packageInfo.isBuiltinModule && packageInfo.webpackBundleSize) {
            result = `BundleSize:${spacing(3)}${formatSize(
                packageInfo.webpackBundleSize.normal,
            )}${spacing(3)}(gzip:${spacing(1)}${formatSize(packageInfo.webpackBundleSize.gzip)})`;
        }
        return result;
    }

    generate(packageInfo: PackageInfo): MarkdownString {
        this.packageInfo = packageInfo;

        let markdown = `${this.pkgName}${spacing(2)}${this.pkgUrl}`;
        markdown += `<br/>${this.bundleSize}`;

        const contents = new MarkdownString(markdown);
        contents.isTrusted = true;
        contents.supportHtml = true;
        return contents;
    }
}

let singleInstance: PkgHoverContentsCreator;
function getPkgHoverContentsCreator() {
    if (!singleInstance) {
        singleInstance = new PkgHoverContentsCreator();
    }
    return singleInstance;
}

export { getPkgHoverContentsCreator };
