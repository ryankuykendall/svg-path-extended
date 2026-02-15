# svg-path-extended

A TypeScript compiler that extends SVG path syntax with variables, expressions, control flow, functions, multi-layer output, and text elements.

## Quick Reference

```bash
npm run build           # Build production bundles (ESM, CJS, browser)
npm run dev             # Build with watch mode
npm test                # Run tests in watch mode
npm run test:run        # Run tests once
npm run cli             # Run CLI in development (via tsx)
npm run dev:website     # Build website + serve at localhost:3000 via Wrangler
npm run build:website   # Full website build (lib + docs + blog + static)
npm run build:docs      # Build docs pages
npm run build:blog      # Build blog pages
```

## Project Layout

```
src/           Compiler, evaluator, CLI, stdlib       → see src/CLAUDE.md
playground/    Vanilla Web Components SPA              → see playground/CLAUDE.md
docs/          Language and CLI documentation
tests/         Vitest test suites
scripts/       Build scripts (docs, blog, website, git hooks)
website/       Cloudflare Pages worker
dist/          Build output (do not edit)
public/        Generated website build (do not edit)
```

## Feature / Bug Lifecycle

### Compiler & CLI (`src/`)

Docs first → failing tests → implement → visual verify → full test suite. See `src/CLAUDE.md` for detailed steps and test file mapping.

### Playground (`playground/`)

Build library → scope components → identify reuse → storybook-driven design → integrate → visual verify. See `playground/CLAUDE.md` for detailed steps.

### Cross-Cutting (both `src/` and `playground/`)

1. Make compiler changes first following the compiler lifecycle above
2. Run `npm run build` — playground loads `dist/index.global.js`
3. Make playground changes following the playground lifecycle above

### Agent Workflow Hints

- **Parallel exploration**: For cross-cutting work, launch explore agents for `src/` and `playground/` simultaneously — they're fully independent codebases connected only by `dist/index.global.js`
- **Targeted tests**: Run specific test files during development (e.g., `npx vitest run tests/layers.test.ts`); full suite before commit
- **Build gate**: `npm run build` is required after any `src/` change before playground testing
- **Doc-first exploration**: When planning compiler features, explore `docs/` in parallel with `src/` since doc-first is the workflow

## Live Playground

- Local: `npm run dev:website` → http://localhost:3000
- Deployed: https://pedestal.design/svg-path-extended/

## Summary Instructions

When compacting, prioritize:
- Recent code changes and their rationale
- Test failures and error messages
- Current task context and next steps
