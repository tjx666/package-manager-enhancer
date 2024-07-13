# Package Manager Enhancer

<div align="center">

[![Version](https://img.shields.io/visual-studio-marketplace/v/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items/YuTengjing.package-manager-enhancer/changelog) [![Installs](https://img.shields.io/visual-studio-marketplace/i/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer) [![Downloads](https://img.shields.io/visual-studio-marketplace/d/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer) [![Rating Star](https://img.shields.io/visual-studio-marketplace/stars/YuTengjing.package-manager-enhancer)](https://marketplace.visualstudio.com/items?itemName=YuTengjing.package-manager-enhancer&ssr=false#review-details) [![Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/YuTengjing.package-manager-enhancer)](https://github.com/tjx666/package-manager-enhancer)

![CI](https://github.com/tjx666/package-manager-enhancer/actions/workflows/ci.yml/badge.svg) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com) [![Github Open Issues](https://img.shields.io/github/issues/tjx666/package-manager-enhancer)](https://github.com/tjx666/package-manager-enhancer/issues) [![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)

</div>

## Features

### pnpm-workspace.yaml codeLens

![pnpm-workspace.yaml codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/pnpm-workspace-codelens.png?raw=true)

### package.json pnpm configuration schema

![package.json pnpm configuration schema](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/pnpm-schema.png?raw=true)

### package.json files property codeLens

![package.json files property codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-json-files-codelens.png?raw=true)

### package.json dependencies codeLens

![package json dependencies codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-json-dependencies-codelens.png?raw=true)

You can click editor title icon toggle it:

![toggle package json dependencies codeLens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/toggle-package-json-dependencies-codelens.png?raw=true)

You can custom the dependencies ast node path by:

```json
{
  "package-manager-enhancer.packageJsonDependenciesCodeLens.dependenciesNodePaths": [
    "dependencies",
    "peerDependencies",
    "devDependencies",
    "resolutions",
    "pnpm.overrides"
  ]
}
```

### npm script run in background

![npm script run in background](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/npm-script-run-background.png?raw=true)

### add missing dependencies

useful when you refactor code from one package to another new package.

![add missing dependencies](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/add-missing-deps.gif?raw=true)

### corepack packageManager codelens

![corepack PackageManager codelens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-manage-codelens.gif?raw=true)

### node version codelens

![node version codelens](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/node-version-codelens.gif?raw=true)

### package.json dependencies definition

![package.json dependencies definition](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/packagejson-definition.gif?raw=true)

### package hover tooltip

![package hover tooltip](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/package-hover-tooltip.png?raw=true)

you can custom the tooltip by settings:

```jsonc
{
  "package-manager-enhancer.packageHoverTooltip.websites": [
    "builtin:npm",
    "builtin:homepage",
    "builtin:repository",
    "[Sync Mirror](https://npmmirror.com/sync/${packageName})",
    "[Npm View](https://npmview.vercel.app/${packageNameAtVersion})",
    "[Npm Trends](https://npmtrends.com/${packageName})",
    "[Npm Graph](https://npmgraph.js.org/?q=${packageNameAtVersion})",
    "[Npm Charts](https://npmcharts.com/compare/${packageName})",
    "[Npm Stats](https://npm-stat.com/charts.html?package=${packageName})",
    "[Moiva](https://moiva.io/?npm=${packageName})",
    "[RunKit](https://npm.runkit.com/${packageName})",
    "[Pkg Size](https://pkg-size.dev/${packageNameAtVersion})",
  ],
  "package-manager-enhancer.packageHoverTooltip.badges": [
    "[![latest version](https://img.shields.io/npm/v/${packageName}?label=latest)](https://www.npmjs.com/package/${packageName})",
    "[![NPM Downloads](https://img.shields.io/npm/dw/${packageName})](https://www.npmjs.com/package/${packageName}?activeTab=versions)",
    "[![GitHub Repo stars](https://img.shields.io/github/stars/${githubUserAndRepo})](https://github.com/${githubUserAndRepo})",
    "[![GitHub Issues](https://img.shields.io/github/issues-raw/${githubUserAndRepo}?label=issues)](https://github.com/${githubUserAndRepo}/issues)",
    "[![NPM Type Definitions](https://img.shields.io/npm/types/${packageName})](https://arethetypeswrong.github.io/?p=${packageNameAtVersion})",
    // add more please check: https://shields.io/badges
  ],
}
```

this feature will reuse the setting `package-manager-enhancer.packageJsonDependenciesCodeLens.dependenciesNodePaths` to recognize dependencies.

### Find Npm Package

![Find Npm Package usage gif](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/find-npm-package.gif?raw=true)

### Find Path in node_modules

![Find Path in node_modules usage gif](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/find-path-in-node-modules.gif?raw=true)

### Deps check

contributed by [@hyoban](https://github.com/hyoban).

![deps check](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/deps-check.gif?raw=true)

also provide a quick fix:

![quick fix](https://github.com/tjx666/package-manager-enhancer/blob/main/assets/screenshots/deps-check-quick-fix.gif?raw=true)

settings:

```json
{
  "package-manager-enhancer.depsVersionCheck.enable": false,
  "package-manager-enhancer.depsVersionCheck.dependenciesNodePaths": [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "resolutions",
    "pnpm.overrides"
    // "xxx.yyy.zzz"
  ]
}
```

If you like this feature, you may also interesting with cli: [stale-dep](https://github.com/sxzz/stale-dep)

## TODOs

- [ ] [outdated packages warning](https://github.com/zyrong/vscode-node-modules/issues/29)
- [ ] `pnpm why` visualization
- [ ] `.npmrc` autocomplete
- [ ] color bundle size

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
