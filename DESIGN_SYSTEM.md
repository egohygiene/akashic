---
schema: aether.architecture-document/v1
id: akashic-design-system
title: Akashic Design System
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-design-system
depends_on:
  - akashic-personal-model
  - akashic-design
related:
  - akashic-purpose
  - akashic-vision
  - akashic-principles
  - akashic-pillars
supersedes: []
---

# Akashic Design System

## Purpose and scope

This document defines reusable semantic language for Akashic's documentation, terminal output, diagrams, reports, sites, and future interactive surfaces. It does not freeze a framework, component library, or final visual identity.

## Semantic roles

| Role | Meaning |
| --- | --- |
| Canvas | Primary quiet background or base surface |
| Surface | Grouped content or bounded interaction area |
| Primary | Main action or navigational emphasis |
| Information | Neutral context or observation |
| Success | Completed and verified state |
| Caution | Review required; safe to pause |
| Danger | Destructive, security, privacy, or irreversible risk |
| Unknown | Missing, unavailable, partial, or unverified state |

## Status vocabulary

Use the states observed, planned, running, partial, verified, failed, blocked, and unknown consistently. Never present partial or unknown as success.

## Content and interaction

- Use verbs that describe the actual operation.
- Put scope and consequence before confirmation.
- Keep destructive actions visually and textually distinct.
- Pair errors with recovery and evidence locations.
- Preserve stable identifiers in machine-readable output.
- Respect reduced-motion and no-color contexts.

## Components and projections

Canonical patterns include command help, progress state, evidence table, decision card, plan preview, validation summary, architecture node, and recovery prompt. Concrete tokens and components are downstream projections maintained by the owning surface.

## Visual direction

The expression should remain cosmic, abundant, approachable, map-like, and careful not to overwhelm while allowing product-specific identity to vary inside Ego Hygiene's broader family.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
