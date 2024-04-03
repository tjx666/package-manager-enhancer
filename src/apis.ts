import allNodeVersions from 'all-node-versions';
import axios from 'axios';
import ExpiryMap from 'expiry-map';
import pMemoize from 'p-memoize';
import fetchPackageJson from 'package-json';
import type { PackageJson } from 'type-fest';

const min = 1000 * 60;

export type NodeVersions =
    | {
          satisfied: string;
          latest: string;
      }
    | undefined;

export const fetchNodeVersions = (() => {
    const cache = new ExpiryMap(min * 2);
    const request = async (version: string): Promise<NodeVersions> => {
        const { versions, majors } = await allNodeVersions({
            mirror: 'https://npmmirror.com/mirrors/node',
        });

        // version not found
        if (versions.every((v) => !v.node.startsWith(version))) {
            return undefined;
        }

        const majorNumber = Number(version.split('.')[0]);
        const satisfied = majors.find((major) => major.major === majorNumber)!.latest;
        const latest = majors.find((major) => major.lts)!.latest;
        return {
            satisfied,
            latest,
        };
    };
    return pMemoize(request, { cache });
})();

export const fetchRemotePackageJson = (() => {
    const cache = new ExpiryMap(min * 5);
    const request = async (pkgName: string, pkgVersion?: string) => {
        const pkgNameAndVersion = `${pkgName}${pkgVersion ? `@${pkgVersion}` : ''}`;
        return fetchPackageJson(pkgNameAndVersion, {
            fullMetadata: true,
        }) as unknown as PackageJson | undefined;
    };
    return pMemoize(request, { cache });
})();

/**
 * Fetch name@version by bundlephobia api
 */
export const fetchBundleSize = (() => {
    const request = async (pkgNameAndVersion: string) => {
        const url = `https://bundlephobia.com/api/size?package=${pkgNameAndVersion}`;
        const { data } = await axios.get<{ gzip?: number; size?: number }>(url, {
            timeout: 5 * 1000,
        });
        if (data && typeof data.size === 'number') {
            return {
                gzip: data.gzip!,
                normal: data.size,
            };
        }
        return undefined;
    };
    // !: cache forever
    return pMemoize(request);
})();

export async function tryFetch<P extends Promise<any>>(
    promise: P,
): Promise<Awaited<P> | undefined> {
    let resp: Awaited<P>;
    try {
        resp = await promise;
    } catch {
        return undefined;
    }
    return resp;
}
