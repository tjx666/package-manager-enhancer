import { resolve } from 'node:path';

import isBuiltinModule from 'is-builtin-module';
import type { PackageJson } from 'type-fest';
import type { CancellationToken } from 'vscode';

import { fetchBundleSize, fetchRemotePackageJson, tryFetch } from '../apis';
import { PACKAGE_JSON } from './constants';
import { readJsonFile } from './fs';

interface PackageJsonData {
    name: string;
    version: string;
    homepage?: string | { url?: string };
    repository?: string | { url?: string };
    bugs?: string | { url?: string };
}

interface BundleSize {
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
          bundleSize?: BundleSize;
          packageJson: PackageJson;
          containsTypes?: boolean;
          isESMModule?: boolean;
      }
    | { isBuiltinModule: true; name: string };

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
            tryFetch(fetchRemotePackageJson(packageName, options.searchVersionRange)));
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
        const bundleSize = await (!options.token?.isCancellationRequested &&
            tryFetch(fetchBundleSize(pkgNameAndVersion)));
        if (bundleSize) {
            (result as any).bundleSize = bundleSize;
        }
    }

    if (result && !result.isBuiltinModule && result.packageJson) {
        const { packageJson } = result;
        let containsTypes = Boolean(
            packageJson.types || packageJson.typings || packageJson.typesVersion,
        );
        if (packageJson.exports !== null && typeof packageJson.exports === 'object') {
            const { exports } = packageJson;
            if (
                'types' in exports ||
                Object.values(exports).some(
                    (value) => value !== null && typeof value === 'object' && 'types' in value,
                )
            ) {
                containsTypes = true;
            }
        }
        result.containsTypes = containsTypes;
        result.isESMModule = Boolean(packageJson.module);
    }

    return result;
}

export { getPackageInfo };
export type { BundleSize, PackageInfo, PackageJsonData };
