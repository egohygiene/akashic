---
schema: aether.architecture-document/v1
id: akashic-system
title: Akashic System
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-system
depends_on:
  - akashic-foundations
  - akashic-ontology
related:
  - akashic-purpose
  - akashic-vision
  - akashic-principles
  - akashic-pillars
supersedes: []
---

# Akashic System

## Purpose and scope

This document identifies Akashic's logical systems and responsibilities. It answers what the major systems do; [ARCHITECTURE.md](ARCHITECTURE.md) owns their structural organization and dependency rules.

## System inventory

| System | State | Responsibility |
| --- | --- | --- |
| Awesome-list sources | Current | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Resource metadata | Current | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Curation workflow | Current | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Link and style validation | Current | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Search index | Current or evolving | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Atlas and map views | Current or evolving | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |
| Static publication | Current or evolving | Owns its bounded portion of a living constellation of curated, focused knowledge collections with an accessible discovery site; exposes explicit inputs, outputs, failure states, and evidence. |

## External systems

- public source websites
- Akashic web experience
- Mindgarden knowledge
- Athena references
- future Pinterest and social projections

External systems are integrations, not hidden implementation units. Each requires version, authentication, availability, data, error, and replacement boundaries appropriate to its risk.

## System interactions

Inputs enter through an adapter or validated contract, move through domain systems, produce artifacts and diagnostics, and leave through a stable interface. Evidence flows back to validation, review, and future decisions.

## Failure model

Systems fail closed at destructive, publication, privacy, and security boundaries. Partial results identify coverage and remain distinguishable from complete success.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
