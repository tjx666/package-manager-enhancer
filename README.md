# Package Manager Enhancer

<div align="center">

[![Version](https://img.shields.io/visual-studio-marketplace/v/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items/YuTengjing.package-manager-enhancer/changelog) [![Installs](https://img.shields.io/visual-studio-marketplace/i/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer) [![Rating Star](https://img.shields.io/visual-studio-marketplace/stars/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer&ssr=false#review-details) [![Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/YuTengjing.package-manager-enhancer)](https://github.com/tjx666/package-manager-enhancer)

![CI](https://github.com/tjx666/package-manager-enhancer/actions/workflows/ci.yml/badge.svg) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com) [![Github Open Issues](https://img.shields.io/github/issues/tjx666/package-manager-enhancer)](https://github.com/tjx666/package-manager-enhancer/issues) [![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)

</div>

## Features

### pnpm-workspace.yaml codeLens

![pnpm-workspace.yaml codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/pnpm-workspace-codelens.png?raw=true)

settings:

```jsonc
{
  "package-manager-enhancer.enablePnpmWorkspaceCodeLens": false,
  "package-manager-enhancer.pnpmWorkspaceCodeLens.titleFormat": "${count} pkgs",
}
```

### package.json pnpm configuration schema

![package.json pnpm configuration schema](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/pnpm-schema.png?raw=true)

### package.json files property codeLens

![package.json files property codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-json-files-codelens.png?raw=true)

settings:

```jsonc
{
  "package-manager-enhancer.enablePackageJsonFilesCodeLens": false,
  // enable this will make files codeLens include package.json, README, LICENSE and main entry file
  "package-manager-enhancer.packageJsonFilesCodeLens.includeDefaultPackedFiles": true,
  "package-manager-enhancer.packageJsonFilesCodeLens.titleFormat": "${count} files",
}
```

### package.json dependencies codeLens

![package json dependencies codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-json-dependencies-codelens.png?raw=true)

You can click editor title icon toggle it:

![toggle package json dependencies codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/toggle-package-json-dependencies-codelens.png?raw=true)

settings:

```jsonc
{
  "package-manager-enhancer.enablePackageJsonDependenciesCodeLens": false,
  "package-manager-enhancer.packageJsonDependenciesCodeLens.dependenciesNodePaths": [
    "dependencies",
    "devDependencies",
    "pnpm.overrides",
  ],
  "package-manager-enhancer.packageJsonDependenciesCodeLens.searchDependenciesFileExtensions": [
    "js",
    "jsx",
    "cjs",
    "mjs",
    "ts",
    "tsx",
    "cts",
    "mts",
    "html",
    "vue",
    "svelte",
    "astro",
  ],
  "package-manager-enhancer.packageJsonDependenciesCodeLens.searchDependenciesExcludePatterns": [
    "**/vendor/**",
    "**/node_modules/**",
    "**/bower_components/**",
    "**/*.code-search/**",
    "**/dist/**",
    "**/out/**",
    "**/build/**",
    "**/_output/**",
    "**/*.min.*",
    "**/*.map",
    "**/.*/**",
  ],
  "package-manager-enhancer.packageJsonDependenciesCodeLens.ignorePatterns": [
    "/path/to/folder/you/want/ignore/package.json",
    "**/xxx/package.json",
  ],
}
```

### Npm Script Run Background

![Npm Script Run Background](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/npm-script-run-background.png?raw=true)

### Go to Symbol in Editor

check issue: [Go to Symbol in Editor doesn't auto fill symbol which current cursor locate in editor](https://github.com/microsoft/vscode/issues/167223)

### Add Missing Dependencies

useful when you refactor code from one package to another new package.

![Add Missing Dependencies](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/add-missing-deps.gif?raw=true)

## TODO

- [ ] nvmrc version lens
- [ ] package.json packageManager, engine version lens
- [ ] npm scripts hover tooltip
  - [ ] Run in Terminal
  - [ ] Copy Shell Script
- [ ] `.npmrc` autocomplete

## My extensions

- [Open in External App](https://github.com/tjx666/open-in-external-app)
- [Neo File Utils](https://github.com/tjx666/vscode-neo-file-utils)
- [VSCode FE Helper](https://github.com/tjx666/vscode-fe-helper)
- [VSCode archive](https://github.com/tjx666/vscode-archive)
- [Modify File Warning](https://github.com/tjx666/modify-file-warning)
- [Power Edit](https://github.com/tjx666/power-edit)
- [Adobe Extension Development Tools](https://github.com/tjx666/vscode-adobe-extension-devtools)
- [Scripting Listener](https://github.com/tjx666/scripting-listener)

Check all here: [publishers/YuTengjing](https://marketplace.visualstudio.com/publishers/YuTengjing)
