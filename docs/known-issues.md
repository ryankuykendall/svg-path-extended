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
