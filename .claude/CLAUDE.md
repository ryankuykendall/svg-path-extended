# svg-path-extended

A TypeScript module that extends SVG path syntax with variables, expressions, control flow, and functions.

## Quick Reference

```bash
npm run build      # Build production bundles (ESM, CJS, browser)
npm run dev        # Build with watch mode
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
npm run cli        # Run CLI in development (via tsx)
```

## Project Structure

```
src/
├── parser/
│   ├── ast.ts         # AST node type definitions
│   └── index.ts       # Parsimmon-based parser
├── evaluator/
│   └── index.ts       # AST evaluator → SVG path strings
├── stdlib/
│   ├── math.ts        # Math functions (sin, cos, lerp, etc.)
│   ├── path.ts        # Path helpers (circle, rect, polygon, star)
│   └── index.ts       # Stdlib exports
├── cli.ts             # CLI entry point
└── index.ts           # Library entry point (exports compile, parse, evaluate)

tests/
├── parser.test.ts     # Parser unit tests
├── evaluator.test.ts  # Evaluator/integration tests
├── errors.test.ts     # Error handling tests
└── cli.test.ts        # CLI integration tests

playground/
└── index.html         # Self-contained browser playground (CodeMirror 6)

docs/
├── syntax.md          # Language syntax reference
├── stdlib.md          # Standard library functions
├── cli.md             # CLI usage and options
└── examples.md        # Practical examples and recipes
```

## Build Artifacts (Do Not Edit Directly)

- `public/` - Generated build output; changes here will be overwritten

## Architecture

- **Parser**: Parsimmon parser combinators. Operator precedence via chained expression parsers (or → and → equality → comparison → additive → multiplicative → unary → primary).

- **Evaluator**: Walks AST, maintains scope chain, evaluates expressions, produces SVG path strings. Has safeguards: max 10,000 loop iterations, rejects Infinity/NaN in loop bounds.

- **Path commands vs identifiers**: Single letters that are SVG path commands (M, L, H, V, C, S, Q, T, A, Z) cannot be used as variable names in path argument positions.

- **calc()**: Required for math expressions in path arguments. Plain identifiers work for simple variable references.

- **User functions**: Return PathSegment objects that stringify when used in path context.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add new syntax | `src/parser/index.ts`, `src/parser/ast.ts` |
| Add runtime behavior | `src/evaluator/index.ts` |
| Add stdlib function | `src/stdlib/math.ts` or `src/stdlib/path.ts` |
| Add CLI option | `src/cli.ts` |
| Update playground | `playground/index.html` |

## Development Workflow

1. **Documentation first** - Update `docs/` before coding (except bug fixes)
2. **Write failing tests** - Parser tests for syntax, evaluator tests for behavior
3. **Implement** - Make tests pass
4. **Visual verify** - Generate SVGs with `--output-svg-file` if applicable

## Live Playground

- Local: `open playground/index.html` (after `npm run build`)
- Deployed: https://ryankuykendall.github.io/svg-path-extended/

## Summary Instructions

When compacting, prioritize:
- Recent code changes and their rationale
- Test failures and error messages
- Current task context and next steps
