# Known Issues and Limitations

This document tracks known issues, limitations, and technical debt in svg-path-extended. Each entry includes when it was discovered, its severity, impact, and potential solutions for future planning.

---

## ISSUE-001: Function calls after path commands parsed as arguments

**Discovered:** 2026-01-17 (during annotated output feature implementation)

**Severity:** Medium

**Description:**

Function calls that immediately follow path commands are parsed as path arguments rather than separate statements. This is due to the greedy nature of `pathArg.many()` in the parser.

**Example:**

```
M 0 0
circle(50, 50, 25)
```

This parses as a single PathCommand with `M` command and arguments `[0, 0, circle(50, 50, 25)]`, not as two separate statements.

**Impact:**

1. **Annotated output:** Function calls in this position don't receive their own `//--- functionName(...) called from line N` annotations
2. **User confusion:** Code that visually looks like separate statements behaves differently than expected
3. **Debugging difficulty:** When functions are called as path arguments, it's harder to trace which function produced which output

**Current Workarounds:**

1. Call functions as standalone statements (not after path commands):
   ```
   circle(50, 50, 25)  // Gets annotated
   M 0 0               // Separate statement
   ```

2. Wrap positioning and function calls together:
   ```
   fn positionedCircle(x, y, r) {
     M x y
     circle(x, y, r)
   }
   positionedCircle(50, 50, 25)
   ```

**Potential Solutions:**

1. **Require explicit delimiters:** Add semicolons or newlines as statement separators
   - Pro: Clear, unambiguous parsing
   - Con: Breaking change, more verbose syntax

2. **Lookahead for statement-level functions:** Detect when a function call on a new line should be a statement
   - Pro: Maintains current syntax
   - Con: Complex parser changes, potentially fragile

3. **Introduce statement terminator for path commands:** Use `Z` or `;` to explicitly end path command argument collection
   - Pro: Backward compatible, opt-in clarity
   - Con: Requires user awareness

4. **Different syntax for path arguments vs statements:** e.g., `M 0 0 @circle(...)` for argument, `circle(...)` for statement
   - Pro: Completely unambiguous
   - Con: New syntax to learn

**Recommended Long-term Solution:**

Option 3 (explicit terminator) seems most pragmatic. Document that path commands greedily consume following function calls, and recommend using `Z` or starting a new path with `M` when transitioning from path commands to function statements.

Alternatively, consider a lint/warning in the CLI that detects this pattern and suggests restructuring.

---

## ISSUE-002: M command doesn't update ctx.position before context-aware functions on separate lines

**Discovered:** 2026-01-25 (during arcFromPolarOffset implementation)

**Severity:** Medium

**Description:**

When an `M` (moveto) command and a context-aware function (like `arcFromPolarOffset`, `polarLine`, etc.) are on separate statements, the `M` command doesn't update `ctx.position` before the function evaluates. The function reads the previous position (often the origin `(0, 0)`) instead of the position set by `M`.

**Example:**

```
M 100 100
arcFromPolarOffset(0, 50, 90deg)
```

Expected: `arcFromPolarOffset` uses position `(100, 100)` to calculate the arc center at `(150, 100)`.

Actual: `arcFromPolarOffset` uses position `(0, 0)`, calculating the arc center at `(50, 0)`.

The output path is `M 100 100 A 50 50 0 0 1 50 -50` — the `M` is present but the arc was calculated from the wrong starting position.

**Impact:**

1. **Incorrect arc calculations:** `arcFromPolarOffset` (and potentially other context-aware functions) produce wrong geometry when preceded by `M` on a separate line
2. **User confusion:** The path contains both the `M` command and the arc, but they don't connect logically
3. **Workaround required:** Users must structure code to avoid this pattern

**Current Workarounds:**

1. Use context-aware functions from the origin without preceding `M`:
   ```
   arcFromPolarOffset(0, 50, 90deg)  // Works correctly from (0, 0)
   ```

2. Use `arcFromCenter` instead, which calculates positions using offsets rather than absolute ctx.position:
   ```
   M 100 100
   arcFromCenter(50, 0, 50, 180deg, 270deg, 1)  // Uses offset from M position
   ```

**Potential Solutions:**

1. **Investigate statement evaluation order:** The issue may be in how `evaluateStatements` processes path commands vs function calls — ensure `M` updates context before the next statement evaluates
   - Pro: Fixes root cause
   - Con: May have unintended side effects on other statement interactions

2. **Force context sync between statements:** Add explicit context synchronization point after each statement
   - Pro: Predictable behavior
   - Con: Performance overhead, may mask other issues

3. **Document as limitation:** Clearly document that context-aware functions should not rely on preceding `M` commands on separate lines
   - Pro: No code changes needed
   - Con: Unintuitive restriction for users

**Recommended Long-term Solution:**

Option 1 — investigate and fix the evaluation order. The current behavior is unintuitive: if `M 100 100` appears in the output path, users reasonably expect subsequent context-aware functions to use that position. This likely requires tracing through `evaluateStatements` and `evaluatePathCommand` to find where the context update is being delayed or lost.

---

## ISSUE-003: Layers menu disappears when code references an undefined layer

**Discovered:** 2026-02-13 (during layer system testing)

**Severity:** Low

**Description:**

When a user writes `layer('some-layer').apply { ... }` but `'some-layer'` has not been defined with a `define` statement, the compiler throws an `Undefined layer` error. Because the entire compilation fails, no `CompileResult` is produced, and the Layers menu in the playground disappears entirely — not just the invalid layer, but all previously visible layers.

**Example:**

```
define PathLayer('outline') { stroke: black; }
layer('outline').apply { M 0 0 L 100 100 }
layer('details').apply { M 50 50 L 75 75 }   // 'details' not defined → error
```

The `outline` layer was valid and visible in the Layers menu before the third line was added, but the compilation error causes the entire menu to vanish.

**Impact:**

1. **Discoverability loss:** Users lose visibility of layers they've already defined while in the middle of writing new layer references
2. **Confusing UX:** The Layers menu appearing and disappearing based on parse/eval success feels unstable

**Current Workarounds:**

1. Always `define` a layer before writing `layer(...).apply` blocks
2. Check the error panel — the error message clearly states which layer is undefined

**Potential Solutions:**

1. **Partial compilation:** Run compilation in two passes — first collect layer definitions, then evaluate apply blocks. If an apply block fails, still report the defined layers
   - Pro: Best UX, layers stay visible during editing
   - Con: Significant compiler architecture change

2. **Cache last successful layer list:** Keep the previous Layers menu state when compilation fails
   - Pro: Simple to implement in the playground
   - Con: Stale data could be confusing (showing layers that no longer exist in the code)

3. **Extract layer definitions without full compilation:** A lightweight regex/parse pass that finds `define ... Layer(...)` statements for the menu, independent of full compilation
   - Pro: Fast, decoupled from compilation success
   - Con: Duplicates parsing logic, could drift out of sync

**Recommended Long-term Solution:**

Option 2 (cache last successful layer list) is the most pragmatic short-term fix. Option 1 (partial compilation) would be ideal long-term but requires rethinking the single-pass evaluator architecture.

---

## Template for New Issues

```markdown
## ISSUE-XXX: Brief title

**Discovered:** YYYY-MM-DD (context)

**Severity:** Low | Medium | High | Critical

**Description:**

What is the issue? Include code examples.

**Impact:**

How does this affect users or the codebase?

**Current Workarounds:**

What can users do today?

**Potential Solutions:**

Numbered list of approaches with pros/cons.

**Recommended Long-term Solution:**

Which solution do we prefer and why?
```
