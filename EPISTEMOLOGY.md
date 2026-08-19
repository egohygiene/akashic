---
schema: aether.architecture-document/v1
id: akashic-epistemology
title: Akashic Epistemology
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-epistemology
depends_on:
  - akashic-purpose
  - akashic-principles
related:
  - akashic-vision
  - akashic-pillars
  - akashic-manifesto
  - akashic-ai-constitution
supersedes: []
---

# Akashic Epistemology

## Scope

This document governs how Akashic classifies claims, evidence, provenance, confidence, conflict, and revision. It does not dictate which technical conclusion must be accepted.

## Claim states

| State | Meaning |
| --- | --- |
| Observed | Directly supported by repository or runtime evidence |
| Decided | Accepted through the repository governance process |
| Inferred | Reasoned from evidence but not directly observed |
| Proposed | Recommended future direction not yet accepted |
| Assumed | Necessary working premise awaiting evidence |
| Unverified | Plausible claim that has not been checked |
| Open question | A known gap requiring investigation or choice |

## Evidence order

1. Reproducible tests, schemas, generated artifacts, and runtime observations.
2. Accepted decisions and versioned specifications.
3. Current source and configuration.
4. Maintainer documentation and issue history.
5. Inference and recommendation, labeled with uncertainty.

## Provenance and conflict

Claims should identify their source closely enough to be rechecked. Conflicting evidence remains visible until the canonical owner resolves it; recency alone does not automatically establish truth.

## Revision

Material claims are revised when stronger evidence appears, their source changes, or an accepted decision supersedes them. Historical decision context is preserved rather than rewritten.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
