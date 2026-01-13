# svg-path-extended - Project Plan

This document captures the original design decisions and implementation plan for svg-path-extended.

## Overview

Create a TypeScript module that extends SVG path syntax with variables, expressions, control flow, and functions. The module should work both as a CLI tool and as a browser-compatible library.

## Project Structure

```
svg-path-extended/
├── src/
│   ├── parser/          # Parsimmon-based parser + AST
│   │   ├── ast.ts       # AST node type definitions
│   │   └── index.ts     # Parser combinators
│   ├── evaluator/       # Execute AST → SVG path string
│   │   └── index.ts
│   ├── stdlib/          # Standard library functions
│   │   ├── math.ts      # sin, cos, lerp, clamp, etc.
│   │   ├── path.ts      # arc, circle, polygon, star
│   │   └── index.ts
│   ├── cli.ts           # CLI entry point
│   └── index.ts         # Library entry point (compile function)
├── tests/
│   ├── parser.test.ts
│   ├── evaluator.test.ts
│   └── integration.test.ts
├── examples/
│   └── basic.svgx       # Example extended SVG path file
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Technology Choices

### Parser Approach

**Parser combinator library: `parsimmon`**
- Well-documented and battle-tested
- TypeScript types included
- Small bundle size (~8KB minified)
- Works in browser
- Declarative grammar definition

*Alternatives considered:*
- `chevrotain` - faster but larger, more complex API
- `arcsecond` - modern but less documentation
- `ts-parsec` - TypeScript-native but smaller community

### Expression Syntax

**Function-call style: `calc()` for math, plain identifiers for variables**
- Inspired by CSS `calc()` - familiar and readable
- Plain variable names: `M x y` (no wrapper needed)
- Math expressions: `L calc(x + 10) calc(y * 2)`
- Simplifies parsing: extensions are clearly delimited by parentheses
- Path commands remain standard SVG syntax outside of calc()

### Build & Bundle

- **TypeScript** for type safety
- **tsup** for bundling (fast, produces ESM + CJS + browser bundle)
- **Vitest** for testing (fast, TypeScript-native)
- **tsx** for running CLI during development

## Syntax Design

```
// Variables
let radius = 50;
let cx = 100;
let cy = 100;

// Plain variables in path commands (no wrapper needed)
M cx cy

// Math expressions require calc()
A radius radius 0 1 1 calc(cx + radius * 2) cy

// Control flow
for (i in 0..5) {
  L calc(i * 20) calc(sin(i) * 30)
}

// Function definitions
fn star(cx, cy, r, points) {
  // returns path segment
}

// Function calls (always use parens, like calc)
M 0 0 star(50, 50, 30, 5)

// Stdlib functions work inside calc()
L calc(cos(angle) * r) calc(sin(angle) * r)
```

**Parsing rules:**
- Numbers and identifiers are parsed as path command arguments
- `calc(...)` triggers expression parsing with full math support
- `name(...)` is a function call (stdlib or user-defined)
- Path commands (M, L, C, A, etc.) follow standard SVG syntax

## Implementation Phases

### Phase 1: Project Setup
1. Create `svg-path-extended/` directory
2. Initialize npm project with TypeScript config
3. Install dependencies: `parsimmon`, `tsup`, `vitest`, `tsx`
4. Configure tsup for ESM + CJS + browser builds
5. Set up basic test infrastructure

### Phase 2: Parser Foundation (using parsimmon)
1. Define AST node types in `src/parser/ast.ts`
2. Parse literal values: numbers
3. Parse identifiers (variable references)
4. Parse path commands (M, L, C, A, Z, etc.) with arguments
5. Parse `calc(expr)` with arithmetic expressions (+, -, *, /, %, parentheses)
6. Parse function calls: `name(arg1, arg2, ...)`

### Phase 3: Variables & Control Flow
1. Parse `let` variable declarations
2. Implement variable scoping in evaluator
3. Parse `for` loops with range syntax (`for (i in 0..n)`)
4. Parse `if/else` conditionals
5. Implement control flow in evaluator

### Phase 4: Functions
1. Parse function definitions (`fn name(args) { ... }`)
2. Parse function calls in expressions
3. Implement function evaluation with local scope
4. Add stdlib: math functions (sin, cos, sqrt, lerp, clamp, etc.)
5. Add stdlib: path helpers (arc, circle, polygon, star)

### Phase 5: CLI & Integration
1. Create CLI entry point with argument parsing
2. Support file input and stdin
3. Add `--output` flag for file output
4. Add `--watch` mode for development
5. Create example files in `examples/`

### Phase 6: Browser & Polish
1. Verify browser bundle works (test in HTML page)
2. Improve error messages with line/column info
3. Create minimal web playground example
4. Write README with usage examples

## Verification

1. **Unit tests**: Test parser and evaluator independently with Vitest
2. **Integration tests**: Full source → SVG path output
3. **CLI smoke test**: `echo 'let x = 10; M x 0 L calc(x + 5) 10' | npx svg-path-extended`
4. **Browser test**: Import in simple HTML page, call `compile()`, verify SVG path output

## Design Decisions

- **Syntax**: `calc()` for math expressions, plain identifiers for variables
- **Parser**: `parsimmon` combinator library
- **Name**: `svg-path-extended`
- **Path commands**: Case-sensitive to match SVG spec (M = absolute, m = relative)
- **Error handling**: Fail fast with clear error messages
