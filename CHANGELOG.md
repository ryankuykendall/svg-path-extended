# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-02-09

### Added

#### Core
- `else if` conditional chains — chain as many `else if` blocks as needed between `if` and `else`.
- `pi` numeric suffix for angle literals (e.g., `0.25pi`, `2pi`) and `mpi(x)` stdlib function for multiplying expressions by pi.
- Variable reassignment support (`x = value;`) — reassign previously declared variables without `let`.
- `toFixed` number precision post-processing — available as a `compile()` option and CLI flag (`--precision`).
- Async interpreter execution via Web Worker (`src/worker.ts`) for non-blocking compilation.

#### Playground
- Export with Legend feature — modal for exporting SVG with a customizable code legend overlay.
- Light/dark theme system with visual refresh and system preference detection.
- Refresh button for recompiling programs that use random functions.
- Persist workspace preferences (canvas size, stroke, fill, grid) on change via autosave service.
- Copy workspace form workflow and increased canvas size limit.
- Toggle publish action on workspace cards.
- Async compilation via Web Worker with performance optimizations.

### Fixed

#### Playground
- Width/height input max validation in footer.
- Console log objects not expandable in console pane.

### Changed

#### Branding
- Playground rebranded to **Pathogen**.

#### Deployment
- Migrated from GitHub Pages to Cloudflare Pages; removed GitHub Actions deploy workflow.

## [Unreleased] - 2026-02-02

### Added

- `arcFromPolarOffset(angle, radius, angleOfArc)` - New context-aware function for drawing arcs where the center is at a polar offset from the current position. Guarantees continuous paths by only emitting `A` commands (never `M` or `L`). Positive `angleOfArc` draws clockwise, negative draws counter-clockwise.
- Context-aware functions documentation in `docs/stdlib.md` covering polar movement, arc functions, and tangent functions.
- Known issue ISSUE-002 documenting M command timing with context-aware functions.
#### Playground
- Autocomplete for the playground CodeMirror editor with snippets, stdlib functions, and context-aware completions.
- Save/load workspace support for `.svgx` files with File System Access API fallbacks and keyboard shortcuts.
- Refactored playground into modular Web Components with shared components, extracted styles, and state store.
- App shell + History API routing with landing, workspace, docs, preferences, and storybook views plus Cloudflare Pages deployment scaffolding.
- Blog feature in the playground with list and post views, markdown rendering, and build/new-post scripts.
- Enhanced component storybook with sidebar navigation, deep links, and interactive demos.
#### Documentation
- Documentation now generated from markdown sources via `scripts/build-docs.js`, including new getting-started/debug content and syntax updates.
- Syntax highlighting for docs using highlight.js (GitHub Dark theme).

#### Development
- Added an optional post-commit hook installer (`scripts/install-git-hooks.sh`) to remind contributors to update `CHANGELOG.md`.

### Fixed

#### Core
- `arcFromCenter` now emits `L` (lineto) instead of `M` (moveto) to reach the arc start point. This keeps paths continuous so that `Z` (closepath) closes to the original path start, not the arc start. If the current position already matches the arc start, only the `A` command is emitted.

#### Deployment
- SPA routing on Cloudflare Pages now supports direct navigation to playground routes via `_worker.js` and a base href update.

### Changed

#### Core
- `arcFromPolarOffset` uses the convention that positive `angleOfArc` is clockwise and negative is counter-clockwise, matching the visual behavior in SVG's Y-down coordinate system.

#### Deployment
- Build output moved to `public/` for Cloudflare Pages auto-detection.

#### Branding
- Page titles updated to include Pedestal Design branding.
