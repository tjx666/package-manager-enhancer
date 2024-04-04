import { join } from 'node:path';

import hostedGitInfo from 'hosted-git-info';
import { isObject } from 'lodash-es';
import { MarkdownString, Uri } from 'vscode';

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

    get packageNameAndVersion() {
        const { packageInfo } = this;
        return (
            packageInfo.name +
            ((packageInfo as any).installedVersion
                ? `@${(packageInfo as any).installedVersion}`
                : '')
        );
    }

    get githubUserAndRepo() {
        if (this.packageInfo.isBuiltinModule) return;
        let repositoryUrl = tryGetUrl(this.packageInfo.packageJson.repository);
        if (repositoryUrl) {
            repositoryUrl = extractGitUrl(repositoryUrl);
        }

        if (repositoryUrl?.startsWith('https://github')) {
            return repositoryUrl.split('/').slice(-2).join('/');
        }
        return undefined;
    }

    get pkgName() {
        return this.packageInfo.name;
    }

    get pkgNameLink() {
        const packageInfo = this.packageInfo;

        let packageName: string, showTextDocumentCmdUri: Uri | undefined;
        if (packageInfo.isBuiltinModule) {
            packageName = packageInfo.name;
        } else {
            packageName = this.packageNameAndVersion;
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
        if (packageInfo.isBuiltinModule) return;

        let homepageUrl: string | undefined, repositoryUrl: string | undefined;

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

        const npmUrl = `https://www.npmjs.com/package/${packageInfo.name}${
            packageInfo.installedVersion ? `/v/${packageInfo.installedVersion}` : ''
        }`;

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

        if (!packageInfo.isBuiltinModule && packageInfo.bundleSize) {
            const { normal, gzip } = packageInfo.bundleSize;
            const bundlephobiaWebsite = `https://bundlephobia.com/package/${this.packageNameAndVersion}`;
            return `[![size](https://img.shields.io/badge/size-${formatSize(normal)}_%7C_gzip_${formatSize(gzip)}-green)](${bundlephobiaWebsite})`;
        }
        return undefined;
    }

    get latestVersion() {
        const badge = `![latest version](https://img.shields.io/npm/v/${this.pkgName}?label=latest)`;
        return `[${badge}](https://www.npmjs.com/package/${this.pkgName})`;
    }

    get downloadCountPerWeek() {
        const badge = `![NPM Downloads](https://img.shields.io/npm/dw/${this.pkgName})`;
        return `[${badge}](https://www.npmjs.com/package/${this.pkgName}?activeTab=versions)`;
    }

    get githubStar() {
        const { githubUserAndRepo } = this;
        if (!githubUserAndRepo) return;

        const badge = `![GitHub Repo stars](https://img.shields.io/github/stars/${githubUserAndRepo})`;
        return `[${badge}](https://github.com/${githubUserAndRepo})`;
    }

    get githubIssueCount() {
        const { githubUserAndRepo } = this;
        if (!githubUserAndRepo) return;

        const badge = `![GitHub Issues](https://img.shields.io/github/issues-raw/${githubUserAndRepo}?label=issues)`;
        return `[${badge}](https://github.com/${githubUserAndRepo}/issues)`;
    }

    get typeDefinition() {
        const badge = `![NPM Type Definitions](https://img.shields.io/npm/types/${this.pkgName})`;
        return `[${badge}](https://arethetypeswrong.github.io/?p=${this.packageNameAndVersion})`;
    }

    get badgeInfos() {
        return [
            this.latestVersion,
            this.downloadCountPerWeek,
            this.bundleSize,
            this.githubStar,
            this.githubIssueCount,
            this.typeDefinition,
        ]
            .filter(Boolean)
            .join(spacing(3));
    }

    generate(packageInfo: PackageInfo): MarkdownString {
        this.packageInfo = packageInfo;

        let markdown = `${this.pkgNameLink}${spacing(2)}`;
        if (this.packageInfo.isBuiltinModule) {
            const homepageUrl = `https://nodejs.org/docs/latest/api/${this.pkgName}.html`;
            const repositoryUrl = `https://github.com/nodejs/node/blob/main/lib/${this.pkgName}.js`;
            markdown += `[Documentation](${homepageUrl})${spacing(4)}`;
            markdown += `[Source Code](${repositoryUrl})`;
        } else {
            markdown += this.pkgUrl;
            markdown += `<br/><br/>${this.badgeInfos}`;
        }

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
