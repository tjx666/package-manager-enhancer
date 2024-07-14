// @ts-expect-error missing types
import { definitions } from '@npmcli/config/lib/definitions';
import { types } from '@pnpm/config';
import vscode from 'vscode';

const options = new Set([
    'hoist',
    'hoist-workspace-packages',
    'hoist-pattern',
    'public-hoist-pattern',
    'shamefully-hoist',
    'modules-dir',
    'node-linker',
    'symlink',
    'enable-modules-dir',
    'virtual-store-dir',
    'virtual-store-dir-max-length',
    'package-import-method',
    'modules-cache-max-age',
    'dlx-cache-max-age',
    'store-dir',
    'verify-store-integrity',
    'use-running-store-server',
    'strict-store-pkg-content-check',
    'lockfile',
    'prefer-frozen-lockfile',
    'lockfile-include-tarball-url',
    'git-branch-lockfile',
    'merge-git-branch-lockfiles-branch-pattern',
    'peers-suffix-max-length',
    'registry',
    'url_authtoken',
    'urltokenhelper',
    'ca',
    'cafile',
    'urlcafile',
    'cert',
    'urlcertfile',
    'key',
    'urlkeyfile',
    'git-shallow-hosts',
    'https-proxy',
    'http-proxy',
    'proxy',
    'local-address',
    'maxsockets',
    'noproxy',
    'strict-ssl',
    'network-concurrency',
    'fetch-retries',
    'fetch-retry-factor',
    'fetch-retry-mintimeout',
    'fetch-retry-maxtimeout',
    'fetch-timeout',
    'auto-install-peers',
    'dedupe-peer-dependents',
    'strict-peer-dependencies',
    'resolve-peers-from-workspace-root',
    'no-color',
    'loglevel',
    'use-beta-cli',
    'recursive-install',
    'engine-strict',
    'npm-path',
    'ignore-scripts',
    'ignore-dep-scripts',
    'child-concurrency',
    'side-effects-cache',
    'side-effects-cache-readonly',
    'unsafe-perm',
    'node-options',
    'use-node-version',
    'node-version',
    'node-mirrorreleasedir',
    'link-workspace-packages',
    'prefer-workspace-packages',
    'shared-workspace-lockfile',
    'save-workspace-protocol',
    'include-workspace-root',
    'ignore-workspace-cycles',
    'disallow-workspace-cycles',
    'save-prefix',
    'tag',
    'global-dir',
    'global-bin-dir',
    'state-dir',
    'cache-dir',
    'use-stderr',
    'update-notifier',
    'prefer-symlinked-executables',
    'ignore-compatibility-db',
    'resolution-mode',
    'registry-supports-time-field',
    'extend-node-path',
    'deploy-all-files',
    'dedupe-direct-deps',
    'dedupe-injected-deps',
    'package-manager-strict',
    'package-manager-strict-version',
    'description',
    '_auth',
    'access',
    'all',
    'allow-same-version',
    'audit',
    'audit-level',
    'auth-type',
    'before',
    'bin-links',
    'browser',
    'cache',
    'call',
    'cidr',
    'color',
    'commit-hooks',
    'cpu',
    'depth',
    'description-1',
    'diff',
    'diff-dst-prefix',
    'diff-ignore-all-space',
    'diff-name-only',
    'diff-no-prefix',
    'diff-src-prefix',
    'diff-text',
    'diff-unified',
    'dry-run',
    'editor',
    'expect-result-count',
    'expect-results',
    'force',
    'foreground-scripts',
    'format-package-lock',
    'fund',
    'git',
    'git-tag-version',
    'global',
    'globalconfig',
    'heading',
    'if-present',
    'include',
    'include-staged',
    'init-author-email',
    'init-author-name',
    'init-author-url',
    'init-license',
    'init-module',
    'init-version',
    'install-links',
    'install-strategy',
    'json',
    'legacy-peer-deps',
    'libc',
    'link',
    'location',
    'lockfile-version',
    'logs-dir',
    'logs-max',
    'long',
    'message',
    'offline',
    'omit',
    'omit-lockfile-registry-resolved',
    'os',
    'otp',
    'pack-destination',
    'package',
    'package-lock',
    'package-lock-only',
    'parseable',
    'prefer-dedupe',
    'prefer-offline',
    'prefer-online',
    'prefix',
    'preid',
    'progress',
    'provenance',
    'provenance-file',
    'read-only',
    'rebuild-bundle',
    'replace-registry-host',
    'save',
    'save-bundle',
    'save-dev',
    'save-exact',
    'save-optional',
    'save-peer',
    'save-prod',
    'sbom-format',
    'sbom-type',
    'scope',
    'script-shell',
    'searchexclude',
    'searchlimit',
    'searchopts',
    'searchstaleness',
    'shell',
    'sign-git-commit',
    'sign-git-tag',
    'strict-peer-deps',
    'tag-version-prefix',
    'timing',
    'umask',
    'unicode',
    'usage',
    'user-agent',
    'userconfig',
    'version',
    'versions',
    'viewer',
    'which',
    'workspace',
    'workspaces',
    'workspaces-update',
    'yes',
    'also',
    'cache-max',
    'cache-min',
    'dev',
    'global-style',
    'initauthoremail',
    'initauthorname',
    'initauthorurl',
    'initlicense',
    'initmodule',
    'initversion',
    'legacy-bundling',
    'only',
    'optional',
    'production',
    'shrinkwrap',
]);

export const npmrcCompletionItemProvider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
        const char = position.character;
        const lineBefore = document.lineAt(position).text.slice(0, char);

        if (lineBefore.endsWith('=')) {
            const key = lineBefore.slice(0, -1);
            if (!options.has(key)) {
                return;
            }
            const availableValues = types[key as keyof typeof types];
            if (availableValues) {
                const isBoolean =
                    typeof availableValues === 'function' && availableValues.name === 'Boolean';

                if (isBoolean) {
                    return {
                        items: [
                            new vscode.CompletionItem('true', vscode.CompletionItemKind.Value),
                            new vscode.CompletionItem('false', vscode.CompletionItemKind.Value),
                        ],
                    };
                }

                const values = Array.isArray(availableValues) ? availableValues : [availableValues];
                const items = values
                    .filter((value) => typeof value === 'string')
                    .map((value) => {
                        const item = new vscode.CompletionItem(
                            value,
                            vscode.CompletionItemKind.Value,
                        );
                        item.insertText = value;
                        return item;
                    });
                return { items };
            }
            return;
        }

        return {
            items: Array.from(options).map(
                (key) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Property),
            ),
        };
    },
    resolveCompletionItem(item) {
        if (item.kind !== vscode.CompletionItemKind.Property) {
            return item;
        }

        const key = item.label;
        const type = types[key as keyof typeof types] ?? definitions[key]?.type;
        const availableValueTypes = type
            ? (Array.isArray(type) ? type : [type])
                  .map((value) =>
                      typeof value === 'string'
                          ? value
                          : typeof value === 'function'
                            ? value.name
                            : String(value),
                  )
                  .filter((value) => value !== '[object Object]')
            : [];
        const availableValueTypesString =
            availableValueTypes.length > 0 ? `\n\nType: ${availableValueTypes.join(' | ')}` : '';
        const description = definitions[key]?.description;
        if (description) {
            item.documentation = new vscode.MarkdownString(
                description
                    .replaceAll('\\`', '`')
                    .split('\n')
                    .map((line: string) => line.trim())
                    .join('\n')
                    .concat(
                        `\n\n[npm .npmrc documentation](https://docs.npmjs.com/cli/v10/using-npm/config#${key})`,
                    )
                    .concat(availableValueTypesString),
            );
        } else {
            item.documentation = new vscode.MarkdownString(
                `[pnpm .npmrc documentation](https://pnpm.io/npmrc#${key})`.concat(
                    availableValueTypesString,
                ),
            );
        }
        item.insertText = `${key}=`;
        return item;
    },
};
