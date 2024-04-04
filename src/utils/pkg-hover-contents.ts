import { join } from 'node:path';

import hostedGitInfo from 'hosted-git-info';
import { isObject } from 'lodash-es';
import { MarkdownString, Uri } from 'vscode';

import { configuration } from '../configuration';
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

const sites = ['npm', 'homepage', 'repository'] as const;
type BuiltinWebsites = { [key in (typeof sites)[number]]: `builtin:${key}` };
const builtinWebsites = sites.reduce((acc, item) => {
    // @ts-expect-error to en fixed
    acc[item] = `builtin:${item}`;
    return acc;
}, {} as BuiltinWebsites);

interface GenerateOptions {
    showDescription?: boolean;
}
class PkgHoverContentsCreator {
    packageInfo!: PackageInfo;

    get packageName() {
        return this.packageInfo.name;
    }

    get packageVersion() {
        const { packageInfo } = this;
        if (packageInfo.isBuiltinModule) return undefined;
        return packageInfo.installedVersion ?? packageInfo.packageJson.version;
    }

    get packageNameAtVersion() {
        const { packageInfo } = this;
        return (
            packageInfo.name +
            ((packageInfo as any).installedVersion
                ? `@${(packageInfo as any).installedVersion}`
                : '')
        );
    }

    get repositoryUrl() {
        const packageInfo = this.packageInfo;
        if (packageInfo.isBuiltinModule) return;

        let repositoryUrl = tryGetUrl(packageInfo.packageJson.repository);

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
        return repositoryUrl;
    }

    get githubUserAndRepo() {
        if (this.packageInfo.isBuiltinModule) return;

        const { repositoryUrl } = this;
        if (repositoryUrl?.startsWith('https://github')) {
            return repositoryUrl.split('/').slice(-2).join('/');
        }
        return undefined;
    }

    get pkgDescription() {
        if (this.packageInfo.isBuiltinModule) return;
        return this.packageInfo.packageJson.description;
    }

    get pkgNameLink() {
        const packageInfo = this.packageInfo;

        let packageName: string, showTextDocumentCmdUri: Uri | undefined;
        if (packageInfo.isBuiltinModule) {
            packageName = packageInfo.name;
        } else {
            packageName = this.packageNameAtVersion;
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

    get bundleSize() {
        const packageInfo = this.packageInfo;

        if (!packageInfo.isBuiltinModule && packageInfo.bundleSize) {
            const { normal, gzip } = packageInfo.bundleSize;
            const bundlephobiaWebsite = `https://bundlephobia.com/package/${this.packageNameAtVersion}`;
            return `[![size](https://img.shields.io/badge/size-${formatSize(normal)}_%7C_gzip_${formatSize(gzip)}-green)](${bundlephobiaWebsite})`;
        }
        return undefined;
    }

    get latestVersion() {
        const badge = `![latest version](https://img.shields.io/npm/v/${this.packageName}?label=latest)`;
        return `[${badge}](https://www.npmjs.com/package/${this.packageName})`;
    }

    get downloadCountPerWeek() {
        const badge = `![NPM Downloads](https://img.shields.io/npm/dw/${this.packageName})`;
        return `[${badge}](https://www.npmjs.com/package/${this.packageName}?activeTab=versions)`;
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
        const badge = `![NPM Type Definitions](https://img.shields.io/npm/types/${this.packageName})`;
        return `[${badge}](https://arethetypeswrong.github.io/?p=${this.packageNameAtVersion})`;
    }

    get moduleInfo() {
        if (this.packageInfo.isBuiltinModule) return;

        const { packageInfo } = this;
        const infos: string[] = [];
        if (packageInfo.isESMModule) {
            infos.push(`[ESM](https://nodejs.org/api/esm.html)`);
        }

        if (packageInfo.containsTypes !== undefined) {
            infos.push(
                `[${packageInfo.containsTypes ? 'Typed' : 'No Types'}](https://arethetypeswrong.github.io/?p=${this.packageNameAtVersion})`,
            );
        }

        if (packageInfo.bundleSize) {
            const { normal, gzip } = packageInfo.bundleSize;
            infos.push(
                `[BundleSize](https://bundlephobia.com/package/${this.packageNameAtVersion}):${spacing(1)}${formatSize(normal)}${spacing(1)}(gzip:${spacing(1)}${formatSize(gzip)})`,
            );
        }

        return infos.length > 0 ? infos.join(spacing(4)) : undefined;
    }

    get pkgWebsites() {
        const packageInfo = this.packageInfo;
        if (packageInfo.isBuiltinModule) return;

        const { websites } = configuration.packageHoverTooltip;
        return websites
            .map((website) => {
                if (website.startsWith('builtin:')) {
                    // eslint-disable-next-line unicorn/prefer-switch
                    if (website === builtinWebsites.npm) {
                        const npmUrl = `https://www.npmjs.com/package/${packageInfo.name}${
                            packageInfo.installedVersion ? `/v/${packageInfo.installedVersion}` : ''
                        }`;
                        return `[Npm](${npmUrl})`;
                    } else if (website === builtinWebsites.homepage) {
                        const homepageUrl = tryGetUrl(packageInfo.packageJson.homepage);
                        if (!homepageUrl) return undefined;

                        if (
                            websites.includes(builtinWebsites.repository) &&
                            this.repositoryUrl === homepageUrl
                        ) {
                            return undefined;
                        }
                        return `[HomePage](${homepageUrl})`;
                    } else if (website === builtinWebsites.repository) {
                        return `[Repository](${this.repositoryUrl})`;
                    }
                    return undefined;
                } else {
                    // 'builtin:npm'
                    // 'builtin:homepage'
                    // 'builtin:repository"
                    // "[Sync Mirror](https://npmmirror.com/sync/${packageName})",
                    // "[Npm View](https://npmview.vercel.app/${packageNameAtVersion})",
                    // "[Npm Trends](https://npmtrends.com/${packageName})",
                    // "[Npm Graph](https://npmgraph.js.org/?q=${packageNameAtVersion})",
                    // "[Npm Charts](https://npmcharts.com/compare/${packageName})",
                    // "[Npm Stats](https://npm-stat.com/charts.html?package=${packageName})",
                    // "[Moiva](https://moiva.io/?npm=${packageName})",
                    // "[RunKit](https://npm.runkit.com/${packageName})"

                    const placeholderKeys = [
                        'packageName',
                        'packageVersion',
                        'packageNameAtVersion',
                    ] as const;
                    for (const key of placeholderKeys) {
                        // eslint-disable-next-line prefer-template
                        const placeholder = '${' + key + '}';
                        if (website.includes(placeholder)) {
                            if (this[key] === undefined) {
                                return undefined;
                            } else {
                                website = website.replaceAll(placeholder, this[key]!);
                            }
                        }
                    }
                    return website;
                }
            })
            .filter(Boolean)
            .join(spacing(4));
    }

    get badgesInfo() {
        return [
            this.latestVersion,
            this.downloadCountPerWeek,
            // this.bundleSize,
            this.githubStar,
            this.githubIssueCount,
            // this.typeDefinition,
        ]
            .filter(Boolean)
            .join(spacing(3));
    }

    generate(
        packageInfo: PackageInfo,
        options?: GenerateOptions,
    ): MarkdownString | MarkdownString[] {
        this.packageInfo = packageInfo;

        let basicInfoMd = `${this.pkgNameLink}${spacing(2)}`;
        let badgesInfoMd = '';

        if (this.packageInfo.isBuiltinModule) {
            const homepageUrl = `https://nodejs.org/docs/latest/api/${this.packageName}.html`;
            const repositoryUrl = `https://github.com/nodejs/node/blob/main/lib/${this.packageName}.js`;
            basicInfoMd += `[Documentation](${homepageUrl})${spacing(4)}`;
            basicInfoMd += `[Source Code](${repositoryUrl})`;
        } else {
            const { moduleInfo, badgesInfo, pkgDescription } = this;
            if (moduleInfo) {
                basicInfoMd += `${moduleInfo}`;
            }
            if (options?.showDescription && pkgDescription) {
                basicInfoMd += `<br />${pkgDescription}`;
            }
            if (badgesInfo) {
                badgesInfoMd = badgesInfo;
            }
        }

        return [basicInfoMd, this.pkgWebsites, badgesInfoMd].filter(Boolean).map((md) => {
            const contents = new MarkdownString(md);
            contents.isTrusted = true;
            contents.supportHtml = true;
            return contents;
        });
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
