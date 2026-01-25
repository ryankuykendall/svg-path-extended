# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `arcFromPolarOffset(angle, radius, angleOfArc)` - New context-aware function for drawing arcs where the center is at a polar offset from the current position. Guarantees continuous paths by only emitting `A` commands (never `M` or `L`). Positive `angleOfArc` draws clockwise, negative draws counter-clockwise.
- Context-aware functions documentation in `docs/stdlib.md` covering polar movement, arc functions, and tangent functions.
- Known issue ISSUE-002 documenting M command timing with context-aware functions.

### Fixed

- `arcFromCenter` now emits `L` (lineto) instead of `M` (moveto) to reach the arc start point. This keeps paths continuous so that `Z` (closepath) closes to the original path start, not the arc start. If the current position already matches the arc start, only the `A` command is emitted.

### Changed

- `arcFromPolarOffset` uses the convention that positive `angleOfArc` is clockwise and negative is counter-clockwise, matching the visual behavior in SVG's Y-down coordinate system.
