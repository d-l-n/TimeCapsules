# Task Brief

Transforms raw requirements into structured tasks.

## Input

Raw user request or issue description.

## Output

Structured task brief with:
- **Goal** — What needs to be achieved (one sentence)
- **Context** — Relevant files, patterns, constraints
- **Steps** — Ordered implementation steps
- **Verification** — How to confirm it works

## Usage

Call with `brief-only` to produce the brief without implementing, or `brief-and-implement` to execute immediately.

---

When invoked:
1. Read AGENTS.md for project conventions
2. Search codebase for similar patterns
3. Read relevant files before making changes
4. Run `npx tsc -b` and `npx oxlint` after changes
