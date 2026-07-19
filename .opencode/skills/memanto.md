# Memanto — Persistent Memory for AI Agents

You have Memanto persistent memory. Use it to remember context across sessions.

## Commands

- `memanto remember "content" --type fact|preference|decision|goal|instruction` — store a memory
- `memanto recall "query"` — search memories
- `memanto answer "question"` — get AI answer grounded in memory
- `memanto status` — check connection
- `memanto memory export` — export all memories to MEMORY.md
- `memanto memory sync` — sync memories into MEMORY.md

## Workflow

1. **Store decisions** as `--type decision` when you make them
2. **Store preferences** as `--type preference` when you learn them
3. **Store facts** as `--type fact` about the project/codebase
4. **Recall** at session start to pick up where you left off
5. **Sync** at session end to update MEMORY.md

## Agent

This project's memanto agent has been created. Activate it with:
`memanto agent activate <project-name>`
