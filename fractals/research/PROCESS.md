# Research Process

*A documented workflow for conducting technical research and synthesizing actionable knowledge.*

---

## Overview

This process transforms raw exploration into practical implementation guidance through three distinct phases:

```
EXPLORATION → RESEARCH DOCUMENT → WORKING THEORY → CLAUDE.MD UPDATE
     ↓              ↓                   ↓                ↓
  Discovery    Comprehensive       Actionable       Institutional
  & Survey      Analysis           Framework         Memory
```

---

## Phase 1: Exploration

**Goal**: Survey the landscape, identify key concepts, gather raw material.

### Activities

1. **Library Survey**
   - Identify relevant libraries, tools, algorithms
   - Note API patterns, performance characteristics
   - Evaluate fit for project constraints (browser, real-time, bundle size)

2. **Academic Review**
   - Find foundational papers and algorithms
   - Understand theoretical basis
   - Note key researchers and seminal works

3. **Implementation Survey**
   - Look at existing implementations (open source, demos)
   - Identify common patterns and pitfalls
   - Note what works in practice vs. theory

4. **Web Research**
   - Save useful pages to `research/references/`
   - Capture diagrams, visualizations, code snippets
   - Document sources for later citation

### Outputs

- Bookmarked references
- Saved web pages in `research/references/`
- Mental model of the problem space
- List of promising approaches

### Time Investment

Variable. Can range from a quick survey (30 min) to deep exploration (background agent over hours).

---

## Phase 2: Research Document

**Goal**: Create a comprehensive, standalone document capturing deep knowledge.

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Depth** | Academic-level detail, thorough coverage |
| **Audience** | Future self, collaborators needing full context |
| **Scope** | Complete treatment of the topic |
| **Style** | Explanatory, includes rationale and alternatives |
| **References** | Cites sources, links to papers/tools |

### Structure Template

```markdown
# [Topic]: [Descriptive Title]

## 0. Executive Summary
- Key findings in 3-5 bullets
- Recommendations for action

## 1. Background / Problem Statement
- Why this matters
- Current state and limitations

## 2. Survey of Approaches
- Approach A: description, pros, cons
- Approach B: description, pros, cons
- Comparison table

## 3. Deep Dive: [Selected Approach]
- How it works
- Implementation details
- Code examples (TypeScript)

## 4. Practical Considerations
- Performance characteristics
- Edge cases and gotchas
- Integration patterns

## 5. Recommendations
- What to implement
- Priority order
- Future exploration areas

## References
- Academic papers
- Library documentation
- Useful implementations
```

### Examples

- `fractal-families.md` — Catalog of 15+ Julia set variants with implementations
- `music-analysis-improvements.md` — Deep dive into analysis libraries and algorithms
- `groove-and-visualizers.md` — Neuroscience of groove applied to visualization

### Quality Checklist

- [ ] Standalone (reader doesn't need prior context)
- [ ] Includes code examples that could be copy-pasted
- [ ] Tables for quick comparison
- [ ] References cited
- [ ] Actionable recommendations

---

## Phase 3: Working Theory

**Goal**: Synthesize research into a practical framework for implementation.

### Characteristics

| Aspect | Description |
|--------|-------------|
| **Depth** | Distilled essentials, no fluff |
| **Audience** | Developer actively implementing |
| **Scope** | What you need to know to build |
| **Style** | Prescriptive, opinionated, actionable |
| **Code** | Ready-to-use snippets, not just examples |

### Key Differences from Research Doc

| Research Document | Working Theory |
|-------------------|----------------|
| Explores alternatives | Recommends specific approach |
| Explains "why it works" | Shows "how to use it" |
| Academic references | Quick reference tables |
| Comprehensive | Focused on implementation |
| Read once, deeply | Reference repeatedly |

### Structure Template

```markdown
# A Working Theory of [Topic] for [Application]

## 0. The Core Model
- Central concept in one sentence
- Key equation or relationship
- The three pillars / main components

## 1. [Pillar 1]
- What it is
- How to compute/measure it
- Code snippet

## 2. [Pillar 2]
...

## 3. Practical Mappings
- Input → Output tables
- Parameter ranges
- Common patterns

## 4. Integration
- How this connects to other systems
- Data flow diagram or interface

## 5. Quick Reference
- Lookup tables
- Formulas at a glance
- Common values

## References
- Link to detailed research doc
- Key external resources
```

### Examples

- `harmonic-analysis-theory.md` — Tension model, key detection, chord mappings
- `fractal-theory.md` — Family selection, animation, parameter space

### Quality Checklist

- [ ] Can implement from this doc alone
- [ ] Quick reference section at end
- [ ] Code snippets are complete and typed
- [ ] Links to detailed research for deep dives
- [ ] Opinionated (makes recommendations, not just options)

---

## Phase 4: CLAUDE.MD Update

**Goal**: Record institutional knowledge so it persists across sessions.

### What to Update

1. **Research Documentation section**
   - Add new documents to the table
   - Brief description of purpose

2. **Key Learnings section** (if applicable)
   - "What Works" — successful patterns from research
   - "What Doesn't Work" — approaches to avoid

3. **Future Ideas section** (if applicable)
   - Promising directions identified but not implemented

### Format

Keep entries concise. CLAUDE.md is for quick reference, not deep reading:

```markdown
| `research/new-topic.md` | Brief description of what it covers |
```

For Key Learnings:
```markdown
- **Pattern name**: One-sentence explanation of what works and why
```

---

## Process Variations

### Quick Research (1-2 hours)

Skip the full research document. Go directly from exploration to working theory if:
- Topic is narrow and well-understood
- Immediate implementation need
- Limited alternatives to evaluate

### Background Research (async)

Use Task tool with background agent for:
- Large surveys (many libraries, many papers)
- Time-intensive exploration
- Non-blocking research while working on other tasks

Example:
```
Task: "Research fractal families beyond standard Julia sets.
       Create comprehensive catalog with implementations."

Run in background, check results later.
```

### Iterative Refinement

Working theories evolve. Update them when:
- Implementation reveals new insights
- "What Works" list grows
- Better approaches discovered

---

## File Naming Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*-theory.md` | Working theory (actionable) | `harmonic-analysis-theory.md` |
| Descriptive name | Research document | `fractal-families.md` |
| `PROCESS.md` | Meta-documentation | This file |
| `references/` | Saved source materials | Web pages, images |

---

## Anti-Patterns

### Research Without Synthesis

**Problem**: Deep research doc created but never distilled into working theory.

**Result**: Knowledge exists but isn't actionable. Implementation requires re-reading entire doc.

**Fix**: Always create working theory after research phase. Even a brief one.

### Theory Without Research

**Problem**: Jump straight to opinionated working theory without exploring alternatives.

**Result**: May miss better approaches. Decisions not grounded in evidence.

**Fix**: At minimum, do quick exploration phase. Document why alternatives were rejected.

### Orphaned Research

**Problem**: Research docs created but not recorded in CLAUDE.md.

**Result**: Forgotten across sessions. Work repeated.

**Fix**: Always update CLAUDE.md Research Documentation section.

### Over-Engineering Process

**Problem**: Treating every question as requiring full research cycle.

**Result**: Slow progress on simple questions.

**Fix**: Match process depth to question complexity. Quick questions get quick answers.

---

## Checklist: Complete Research Cycle

```
□ Phase 1: Exploration
  □ Surveyed relevant libraries/tools
  □ Reviewed academic foundations
  □ Saved references to research/references/

□ Phase 2: Research Document
  □ Created comprehensive .md in research/
  □ Includes code examples
  □ Has comparison tables
  □ Cites sources

□ Phase 3: Working Theory
  □ Created *-theory.md distilling research
  □ Includes quick reference section
  □ Code snippets are implementation-ready
  □ Links to detailed research doc

□ Phase 4: CLAUDE.md Update
  □ Added to Research Documentation table
  □ Updated Key Learnings if applicable
  □ Added Future Ideas if discovered
```

---

## Example: The Harmonic Analysis Research Cycle

**Exploration**:
- Surveyed Essentia.js, Tonal.js, music21
- Reviewed Krumhansl key profiles, Lerdahl tension model
- Examined existing chord detection implementations

**Research Document** (`music-analysis-improvements.md`):
- 400+ lines covering key detection algorithms
- Comparison of profile variants (Krumhansl, Temperley, Shaath)
- Chord template matching approaches
- Secondary dominant detection

**Working Theory** (`harmonic-analysis-theory.md`):
- Three pillars model (hierarchy, quality, motion)
- Tension computation formula with weights
- Quick reference tables for degree/quality tension
- Ready-to-use TypeScript interfaces

**CLAUDE.md Update**:
- Added both docs to Research Documentation section
- Added tension model summary to relevant sections

---

*This process document itself follows the pattern: it synthesizes our research practices into an actionable framework.*
