import { resolve } from 'node:path';

import axios from 'axios';
import isBuiltinModule from 'is-builtin-module';
import { LRUCache } from 'lru-cache';
import _fetchPackageJson from 'package-json';
import type { PackageJson } from 'type-fest';
import type { CancellationToken } from 'vscode';

import { promiseDebounce } from '.';
import { PACKAGE_JSON } from './constants';
import { readJsonFile } from './fs';

interface PackageJsonData {
    name: string;
    version: string;
    homepage?: string | { url?: string };
    repository?: string | { url?: string };
    bugs?: string | { url?: string };
}

interface WebpackBundleSize {
    gzip: number;
    normal: number;
}

type PackageInfo =
    | {
          name: string;
          version: string;
          // latestVersion?: string
          isBuiltinModule: false;
          installedVersion?: string;
          installDir?: string;
          webpackBundleSize?: WebpackBundleSize;
          packageJson: PackageJson;
      }
    | { isBuiltinModule: true; name: string };

const fetchPackageJson = promiseDebounce(_fetchPackageJson, (pkgNameAndRangeVersion: string) => {
    return pkgNameAndRangeVersion;
});
const remotePkgMetadataCache = new LRUCache<string, PackageJson>({
    max: 100,
    // 10 mins
    ttl: 1000 * 60 * 10,
});
async function getRemotePackageJsonData(pkgName: string, pkgVersion?: string) {
    const pkgNameAndVersion = `${pkgName}${pkgVersion ? `@${pkgVersion}` : ''}`;
    if (!remotePkgMetadataCache.has(pkgNameAndVersion)) {
        const pkgJsonData = (await fetchPackageJson(pkgNameAndVersion, {
            fullMetadata: true,
        })) as unknown as PackageJson | undefined;
        if (pkgJsonData) {
            remotePkgMetadataCache.set(pkgNameAndVersion, pkgJsonData);
            return pkgJsonData;
        }
        return undefined;
    } else {
        return remotePkgMetadataCache.get(pkgNameAndVersion)!;
    }
}

const getBundlephobiaApiSize = promiseDebounce(
    (pkgNameAndVersion: string) => {
        const url = `https://bundlephobia.com/api/size?package=${pkgNameAndVersion}`;
        return axios
            .get<{ gzip?: number; size?: number }>(url, {
                timeout: 5 * 1000,
            })
            .catch(() => undefined);
    },
    (pkgNameAndVersion: string) => pkgNameAndVersion,
);

const pkgWebpackBundleSizeCache = new LRUCache<string, WebpackBundleSize>({
    max: 100,
    ttl: 1000 * 60 * 10,
});

async function getPkgWebpackBundleSize(pkgNameAndVersion: string) {
    let bundleSizeInfo = pkgWebpackBundleSizeCache.get(pkgNameAndVersion);
    if (!bundleSizeInfo) {
        const resp = await getBundlephobiaApiSize(pkgNameAndVersion);
        if (!resp) return;

        const { data } = resp;
        if (data && typeof data.size === 'number') {
            bundleSizeInfo = {
                gzip: data.gzip!,
                normal: data.size,
            };
            pkgWebpackBundleSizeCache.set(pkgNameAndVersion, bundleSizeInfo);
        }
    }
    return bundleSizeInfo;
}

const getPackageInfoDefaultOptions = {
    remoteFetch: true,
    fetchBundleSize: true,
    skipBuiltinModuleCheck: false,
};
async function getPackageInfo(
    packageName: string,
    options: {
        packageInstallDir?: string;
        searchVersionRange?: string;
        remoteFetch?: boolean;
        fetchBundleSize?: boolean;
        token?: CancellationToken;
        skipBuiltinModuleCheck?: boolean;
        // getLatestVersion?: boolean
    } = {},
) {
    options = {
        ...getPackageInfoDefaultOptions,
        ...options,
    };
    let result: PackageInfo | undefined;
    // const getLatestVersion = options.getLatestVersion || false

    if (
        !options.packageInstallDir &&
        !options.skipBuiltinModuleCheck &&
        isBuiltinModule(packageName)
    ) {
        result = {
            name: packageName,
            isBuiltinModule: true,
        };
        return result;
    }

    if (options.packageInstallDir) {
        const localPkgJson = await readJsonFile<PackageJson>(
            resolve(options.packageInstallDir, PACKAGE_JSON),
        );
        if (localPkgJson !== undefined) {
            result = {
                name: packageName,
                version: localPkgJson.version!,
                isBuiltinModule: false,
                installedVersion: localPkgJson.version,
                installDir: options.packageInstallDir,
                packageJson: localPkgJson,
            };
        }
    }

    if (!result && options.remoteFetch) {
        const remotePackageJsonData = await (!options.token?.isCancellationRequested &&
            getRemotePackageJsonData(packageName, options.searchVersionRange));
        if (remotePackageJsonData) {
            result = {
                name: packageName,
                version: remotePackageJsonData.version!,
                isBuiltinModule: false,
                packageJson: remotePackageJsonData,
            };
        }
    }

    if (result && options.fetchBundleSize) {
        const pkgNameAndVersion = `${result.name}@${(result as any).version}`;
        const webpackBundleSize = await (!options.token?.isCancellationRequested &&
            getPkgWebpackBundleSize(pkgNameAndVersion));
        if (webpackBundleSize) {
            (result as any).webpackBundleSize = webpackBundleSize;
        }
    }

    return result;
}

export { getPackageInfo };
export type { PackageInfo, PackageJsonData, WebpackBundleSize };
