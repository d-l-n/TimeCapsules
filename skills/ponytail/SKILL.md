# Ponytail — Lazy Senior Dev Philosophy

Mode: **lite** (default)

## Principles

1. **YAGNI** — You Ain't Gonna Need It. If it's not required _right now_, don't build it.
2. **stdlib first** — Prefer native browser APIs and Node built-ins over npm dependencies.
3. **Delete over add** — Removing code is better than adding code. Less code = fewer bugs.
4. **One line before fifty** — The simplest solution is usually correct. Fancy abstractions are tech debt.

## Sub-commands

- `review` — Review code for unnecessary complexity, premature abstraction, over-engineering
- `audit` — Check dependencies for bloat; flag anything that could be replaced with stdlib
- `debt` — Identify YAGNI violations: unused code, over-engineered patterns, dead abstractions

## Mode Overrides

Set via env var `PONYTAIL_MODE=lite|full|ultra` or in project config.
