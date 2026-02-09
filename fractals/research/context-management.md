# Managing Non-Trivial Context in Claude Code

Short memo on reducing context overhead for AI-assisted development.

## The Problem

Large instruction files (CLAUDE.md) load into every conversation. An 800+ line file burns context on every turn, leading to frequent compaction and lost continuity.

## Solution: Index + Detail Docs

Split monolithic docs into:
1. **Lean index** (~120 lines) — Architecture, quick reference, essential patterns
2. **Detail docs** (on-demand) — Effect catalogs, schema procedures, learnings

The index points to detail docs. Claude reads them only when relevant to the task.

**Result**: 85% reduction in always-loaded context (827 → 121 lines).

## File Reads

- Use `offset`/`limit` params for large files
- Use Grep to find line numbers before targeted reads
- Don't re-read files after small edits

## Research Tasks

Use Task tool with Explore agent for open-ended research. Runs in separate context, returns summary.

## Edits

Batch multiple edits in single messages when possible.

## What Goes Where

| Content | Location |
|---------|----------|
| Architecture overview | CLAUDE.md |
| Quick reference tables | CLAUDE.md |
| Essential code patterns | CLAUDE.md |
| Detailed catalogs | docs/*.md |
| Step-by-step procedures | docs/*.md |
| What works/doesn't | docs/key-learnings.md |
| Academic research | research/*.md |
