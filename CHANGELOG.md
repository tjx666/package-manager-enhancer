<!-- https://keepachangelog.com/en/1.0.0/ -->

## v0.10.0 (2023-07-13)

### 🚀 Features

- Support add version when add missing deps ([1faf183](https://github.com/tjx666/package-manager-enhancer/commit/1faf183))

### ❤️ Contributors

- YuTengjing ([@tjx666](http://github.com/tjx666))

[View changes on GitHub](https://github.com/tjx666/package-manager-enhancer/compare/v0.9.2...v0.10.0 '2023-07-13')

## v0.9.2 (2023-07-12)

[View changes on GitHub](https://github.com/tjx666/package-manager-enhancer/compare/v0.9.1...v0.9.2 '2023-07-12')

## 0.8.9 - 2023-06-18

### Fixed

- can't recognize import \*

## 0.8.7 - 2023-06-18

### Fixed

- can't recognize imported member with number

## 0.8.5 - 2023-05-28

### Changed

- perf: glob search disable followSymbolicLinks

## 0.8.4 - 2023-05-27

### Fixed

- pnpm workspace codelens doesn't work when packages glob isn't quoted

## 0.8.3 - 2023-04-28

### Changed

- perf: optimize rg search cpu costs

## 0.8.2 - 2023-04-27

### Fixed

- name and packageManager of run script background

### Changed

- update yaml

## 0.8.1 - 2023-04-26

### Changed

- refactor: ignore parse ast error

## 0.8.0 - 2023-04-26

### Added

- feat: run npm script background

### Change

- perf: only trigger resolve codeLens when affect extension config

## 0.7.1 - 2023-04-23

### Change

- optimize debounce and throttle

## 0.7.0 - 2023-04-22

### Added

- feat: support custom glob codeLens title format
- feat: support showing search imports state

### Changed

- perf: avoid many useless fire provideCodeLenses

## 0.6.0 - 2023-04-22

### Added

- add toggle dependencies codeLens icon

### Changed

- perf: throttle fire provide codeLens

### Fixed

- can't enable codeLens if is disable when startup

## 0.5.0 - 2023-04-21

### Added

- dependencies codeLens support multi line import statement
- new setting: `package-manager-enhancer.enableLogInfo`
- new setting: `package-manager-enhancer.packageJsonDependenciesCodeLens.ignorePatterns`

### Fixed

- dependencies codelens missing unassigned imports
- dependencies codelens can't deal with module path contains `.`

## 0.4.0 - 2023-04-20

### Added

- add editor/title/context menu tot toggle package json deps codeLens

### Changed

- simplify codelens display
- kill previous search process if search same dep again

## 0.3.0 - 2023-04-20

### Added

- new configuration: `package-manager-enhancer.packageJsonFilesCodeLens.includeDefaultPackedFiles`
- dependencies codelens support distinct imports and type imports

### Fixed

- configuration `package-manager-enhancer.packageJsonDependenciesCodeLens.searchDependenciesExcludePatterns` doesn't work

## 0.2.0 - 2023-04-18

### Added

- package.json `dependencies` codeLens
- many customization configuration

## 0.1.1 - 2023-04-16

### Fixed

- fix package.json files property codeLens patterns

## 0.1.0 - 2023-04-15

### Added

- package.json `files` property codeLens

### Changed

- open file instead of reference panel when reference count is 1

## 0.0.3 - 2023-04-10

### Changed

- correct README title
- add some todo

## 0.0.2 - 2023-04-10

### Added

- package.json pnpm configuration schema

## 0.0.1 - 2023-04-09

### Added

- pnpm-workspace.yaml codeLens
