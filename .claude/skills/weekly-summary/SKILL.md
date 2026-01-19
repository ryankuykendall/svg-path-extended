---
name: weekly-summary
description: Generate weekly project summaries from git history. Use when user asks for a weekly summary, status report, executive summary, or wants to summarize recent work for sharing with others.
---

# Weekly Project Summary Skill

## Purpose

Generate a one-page executive summary of project work based on git commit history, suitable for sharing with colleagues, stakeholders, or friends.

## When to Use

- User asks for a "weekly summary" or "status report"
- User wants to share progress with someone
- User asks "what did we do this week?"
- End of week documentation needs

## Instructions

When generating a weekly summary:

1. **Gather git history** for the past 7 days:
   ```bash
   git log --since="7 days ago" --oneline --reverse
   git log --since="7 days ago" --pretty=format:"%h %s%n%b" --reverse
   ```

2. **Analyze commits** to identify:
   - Major features added
   - Bug fixes
   - Documentation updates
   - Infrastructure/tooling changes
   - Breaking changes

3. **Calculate metrics**:
   - Total commits
   - Files changed (use `git diff --stat` between first and last commit)
   - Test count if available (check test output or count test files)

4. **Generate summary** in this format:

```markdown
# [Project Name]: Weekly Executive Summary

**Week of [Start Date] - [End Date]**

---

## Overview

[2-3 sentence high-level summary of the week's focus]

---

## Key Accomplishments

### [Category 1]
- Bullet points of work done

### [Category 2]
- Bullet points of work done

---

## By the Numbers

| Metric | Value |
|--------|-------|
| Total Commits | X |
| [Other relevant metrics] | Y |

---

## Technical Highlights

- Notable fixes or improvements
- Architecture decisions

---

## Next Steps

- Planned future work

---

*Generated: [Date]*
```

5. **Save the summary** to a file named `WEEKLY-SUMMARY-[DATE].md` in the project root.

## Output Guidelines

- Keep it to one page (readable in 2-3 minutes)
- Use concrete numbers and metrics
- Highlight user-facing changes over internal refactoring
- Group related commits into coherent themes
- Avoid technical jargon when possible
- Include the generation date for reference

## Example Invocations

- "Generate a weekly summary"
- "Create an executive summary for this week"
- "I need to share our progress with my team"
- "What have we accomplished this week?"
