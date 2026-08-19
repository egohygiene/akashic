---
schema: aether.architecture-document/v1
id: akashic-methodology
title: Akashic Methodology
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-19
governed_by:
  - architecture-methodology
depends_on:
  - akashic-principles
  - akashic-epistemology
  - akashic-ai-constitution
  - akashic-foundations
  - akashic-architecture
related:
  - akashic-purpose
  - akashic-vision
  - akashic-pillars
  - akashic-manifesto
supersedes: []
---

# Akashic Methodology

## Working method

Akashic combines specification-driven, schema-driven, and test-driven development in one evidence loop:

> Discover → Model → Specify → Plan → Test → Implement → Validate → Review → Integrate → Reflect

## Method contracts

1. **Discover evidence:** inspect current source, runtime behavior, users, risks, and neighboring ownership.
2. **Model the domain:** update ontology and boundaries before encoding unstable terminology.
3. **Specify behavior:** define inputs, outputs, invariants, authority, failures, and acceptance criteria.
4. **Define schemas:** make durable machine boundaries independently validatable.
5. **Write tests:** cover happy paths, boundaries, failures, compatibility, and safety properties.
6. **Implement narrowly:** change only the owning system and adapters required by the specification.
7. **Validate evidence:** run deterministic checks and preserve important results.
8. **Review impact:** inspect architecture, security, privacy, accessibility, operations, and downstream consumers.
9. **Integrate and reflect:** publish through the defined lifecycle and feed lessons into decisions and roadmap.

## Quality gates

- Structural and schema validation.
- Unit, integration, contract, and end-to-end tests appropriate to the change.
- Security, dependency, licensing, privacy, and secret checks.
- Documentation and architecture consistency.
- Reproducible build or artifact verification.
- Human approval at external, destructive, billing, production, or publication boundaries.

## AI collaboration

Agents may accelerate discovery, drafting, implementation, and verification within explicit scope. They preserve provenance, report failures honestly, and do not convert recommendations into accepted decisions.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
