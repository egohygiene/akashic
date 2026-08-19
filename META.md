---
schema: aether.architecture-document/v1
id: akashic-meta
title: Akashic Meta
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-meta
depends_on:
  - akashic-epistemology
  - akashic-ai-constitution
related:
  - akashic-purpose
  - akashic-vision
  - akashic-principles
  - akashic-pillars
supersedes: []
---

# Akashic Meta Architecture

## Architecture-system overview

Akashic's architecture is an 18-document graph materialized from the Aether architecture specifications. Each document owns one bounded concern. This index maps ownership and relationships without replacing the documents themselves.

## Document inventory

| Artifact | Path | Category | Status | Governing specification | Upstream dependencies |
| --- | --- | --- | --- | --- | --- |
| akashic-purpose | [PURPOSE.md](PURPOSE.md) | Identity | draft | architecture-purpose | — |
| akashic-vision | [VISION.md](VISION.md) | Identity | draft | architecture-vision | akashic-purpose |
| akashic-principles | [PRINCIPLES.md](PRINCIPLES.md) | Identity | draft | architecture-principles | akashic-purpose, akashic-vision |
| akashic-pillars | [PILLARS.md](PILLARS.md) | Identity | draft | architecture-pillars | akashic-purpose, akashic-vision, akashic-principles |
| akashic-manifesto | [MANIFESTO.md](MANIFESTO.md) | Identity | draft | architecture-manifesto | akashic-purpose, akashic-vision, akashic-principles, akashic-pillars |
| akashic-epistemology | [EPISTEMOLOGY.md](EPISTEMOLOGY.md) | Meta | draft | architecture-epistemology | akashic-purpose, akashic-principles |
| akashic-ai-constitution | [AI_CONSTITUTION.md](AI_CONSTITUTION.md) | Meta | draft | architecture-ai-constitution | akashic-purpose, akashic-vision, akashic-principles, akashic-epistemology |
| akashic-ontology | [ONTOLOGY.md](ONTOLOGY.md) | Domain | draft | architecture-ontology | akashic-purpose, akashic-vision, akashic-principles, akashic-epistemology |
| akashic-personal-model | [PERSONAL_MODEL.md](PERSONAL_MODEL.md) | Domain | draft | architecture-personal-model | akashic-purpose, akashic-vision, akashic-principles, akashic-epistemology, akashic-ontology |
| akashic-foundations | [FOUNDATIONS.md](FOUNDATIONS.md) | Foundation | draft | architecture-foundations | akashic-purpose, akashic-principles, akashic-epistemology |
| akashic-system | [SYSTEM.md](SYSTEM.md) | Foundation | draft | architecture-system | akashic-foundations, akashic-ontology |
| akashic-architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | Foundation | draft | architecture-architecture | akashic-foundations, akashic-system |
| akashic-methodology | [METHODOLOGY.md](METHODOLOGY.md) | Foundation | draft | architecture-methodology | akashic-principles, akashic-epistemology, akashic-ai-constitution, akashic-foundations, akashic-architecture |
| akashic-design | [DESIGN.md](DESIGN.md) | Experience | draft | architecture-design | akashic-purpose, akashic-vision, akashic-principles, akashic-personal-model |
| akashic-design-system | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Experience | draft | architecture-design-system | akashic-personal-model, akashic-design |
| akashic-decisions | [DECISIONS.md](DECISIONS.md) | Governance | draft | architecture-decisions | akashic-principles, akashic-epistemology, akashic-foundations, akashic-system, akashic-architecture |
| akashic-roadmap | [ROADMAP.md](ROADMAP.md) | Foundation | draft | architecture-roadmap | akashic-vision, akashic-pillars, akashic-architecture, akashic-decisions |
| akashic-meta | [META.md](META.md) | Meta | draft | architecture-meta | akashic-epistemology, akashic-ai-constitution |

## Relationship graph

```mermaid
flowchart TD
  PURPOSE --> VISION --> PRINCIPLES --> PILLARS --> MANIFESTO
  PURPOSE --> EPISTEMOLOGY --> AI[AI Constitution]
  PRINCIPLES --> EPISTEMOLOGY
  EPISTEMOLOGY --> ONTOLOGY --> PERSONAL[Personal Model]
  PRINCIPLES --> FOUNDATIONS
  EPISTEMOLOGY --> FOUNDATIONS
  FOUNDATIONS --> SYSTEM --> ARCHITECTURE --> METHODOLOGY
  PERSONAL --> DESIGN --> DS[Design System]
  ARCHITECTURE --> DECISIONS --> ROADMAP
  PILLARS --> ROADMAP
  AI --> META
  EPISTEMOLOGY --> META
```

## Ownership map

- Identity documents own why the repository exists, its desired future, decision heuristics, strategic capabilities, and public commitments.
- Meta documents own knowledge integrity, AI authority, and navigation of this document system.
- Domain documents own canonical concepts and bounded human assumptions.
- Foundation documents own invariants, logical systems, structure, working method, and strategic evolution.
- Experience documents own intended experience and reusable semantic design language.
- Governance owns accepted architectural decisions and historical lineage.

## Reading order

1. PURPOSE, VISION, and PRINCIPLES.
2. EPISTEMOLOGY and ONTOLOGY.
3. FOUNDATIONS, SYSTEM, and ARCHITECTURE.
4. PERSONAL_MODEL, DESIGN, and DESIGN_SYSTEM when evaluating human-facing surfaces.
5. AI_CONSTITUTION before delegating consequential work.
6. DECISIONS and ROADMAP for accepted constraints and evolution.

## Authoring order

Follow the dependency graph from purpose through identity and evidence, then domain and foundations, experience, governance, roadmap, and finally this META index.

## Lifecycle and validation

All documents begin as draft and require human review before becoming active. Validation covers frontmatter, stable identifiers, links, graph acyclicity, ownership boundaries, evidence labels, Markdown structure, and agreement with repository reality.

## Change propagation

A material upstream change triggers review of every downstream node. Implementation changes first update the owning specification or decision when they alter durable behavior; META changes whenever inventory or relationships change.

## Gaps and omissions

- No document in this set is intentionally omitted because Akashic has repository, automation, human, AI, and public or documentation surfaces that justify the complete reference set.
- Target systems remain provisional where implementation evidence is absent.
- Repository-local schemas and automated graph validation should be added or connected to Aether in a later conformance pass.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
