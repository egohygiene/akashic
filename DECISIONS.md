---
schema: aether.architecture-document/v1
id: akashic-decisions
title: Akashic Decisions
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-decisions
depends_on:
  - akashic-principles
  - akashic-epistemology
  - akashic-foundations
  - akashic-system
  - akashic-architecture
related:
  - akashic-purpose
  - akashic-vision
  - akashic-pillars
  - akashic-manifesto
supersedes: []
---

# Akashic Decisions

## Purpose

This document preserves significant accepted architectural choices and their rationale. Issues coordinate work, proposals explore alternatives, and this file records decisions that constrain future implementation.

## Governance

Do not rewrite historical context to fit current understanding. Amend a record for corrections that do not change meaning; supersede it with a new record when the decision changes materially.

## Index

- ADR-0001: Keep focused lists independently scoped
- ADR-0002: Link outward instead of mirroring entire sources
- ADR-0003: Publish a generated static discovery experience

## ADR-0001: Keep focused lists independently scoped

- **Status:** Accepted as the current architectural direction
- **Date:** 2026-08-19
- **Context:** Repository evidence and ecosystem ownership require an explicit durable boundary.
- **Decision:** Keep focused lists independently scoped.
- **Consequences:** The choice improves ownership and predictability while requiring maintained contracts, validation, and migration discipline.
- **Reconsider when:** New evidence shows that the boundary prevents standalone usefulness, safety, portability, or maintainability.

## ADR-0002: Link outward instead of mirroring entire sources

- **Status:** Accepted as the current architectural direction
- **Date:** 2026-08-19
- **Context:** Repository evidence and ecosystem ownership require an explicit durable boundary.
- **Decision:** Link outward instead of mirroring entire sources.
- **Consequences:** The choice improves ownership and predictability while requiring maintained contracts, validation, and migration discipline.
- **Reconsider when:** New evidence shows that the boundary prevents standalone usefulness, safety, portability, or maintainability.

## ADR-0003: Publish a generated static discovery experience

- **Status:** Accepted as the current architectural direction
- **Date:** 2026-08-19
- **Context:** Repository evidence and ecosystem ownership require an explicit durable boundary.
- **Decision:** Publish a generated static discovery experience.
- **Consequences:** The choice improves ownership and predictability while requiring maintained contracts, validation, and migration discipline.
- **Reconsider when:** New evidence shows that the boundary prevents standalone usefulness, safety, portability, or maintainability.

## Open decisions

- Release and compatibility policy for the first stable version.
- Exact self-hosted, managed, and organization-integrated deployment boundaries.
- Which target systems must exist before the architecture status may become active.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?

## Identifier format migration (2026-10-18)

The maintainer selected four-digit numbering in [Hygiene #73](https://github.com/egohygiene/hygiene/issues/73). This padding-only migration changes current labels and anchors; logical numbers, decision content, dates and disposition remain unchanged. Git retains prior versions. New canonical records use `ADR-NNNN` under Hygiene policy v1.2.0.

| Previous ID | Current ID | Record |
| --- | --- | --- |
| `ADR-001` | `ADR-0001` | [DECISIONS.md](DECISIONS.md#adr-0001-keep-focused-lists-independently-scoped) |
| `ADR-002` | `ADR-0002` | [DECISIONS.md](DECISIONS.md#adr-0002-link-outward-instead-of-mirroring-entire-sources) |
| `ADR-003` | `ADR-0003` | [DECISIONS.md](DECISIONS.md#adr-0003-publish-a-generated-static-discovery-experience) |
