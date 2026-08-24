---
schema: aether.architecture-document/v1
id: akashic-roadmap
title: Akashic Roadmap
kind: architecture-document
version: 0.1.0
status: draft
owners:
  - egohygiene
created: 2026-08-19
updated: 2026-08-24
governed_by:
  - architecture-roadmap
depends_on:
  - akashic-vision
  - akashic-pillars
  - akashic-architecture
  - akashic-decisions
related:
  - akashic-purpose
  - akashic-principles
  - akashic-manifesto
  - akashic-epistemology
supersedes: []
---

# Akashic Roadmap

<!-- BEGIN ROADMAP EXECUTION SNAPSHOT -->
<!-- roadmap-manifest
schema: hygiene.roadmap/v1alpha1
repository: egohygiene/akashic
visibility: public
publication: composed
route: /roadmap/
updated: 2026-08-24
-->
## 2026-08-24 execution snapshot

> This evidence-reconciled snapshot is the issue-generation and visual-roadmap handoff. The longer-horizon strategy below remains canonical context; generated HTML, JSON, progress, issue plans, and commit lists are projections.

**Lifecycle:** operational public beta  
**Current gate:** Promote issue #34 as the canonical roadmap and deliver stable identifiers and the search work in issue #42.  
**North-star outcome:** A curated, durable, searchable, and legally legible public knowledge commons organized around human needs.

### Visual roadmap publication

**Mode:** `composed`  
**Route:** `/roadmap/`  
**Current publication evidence:** Live GitHub Pages site at https://akashic.egohygiene.io/ with green quality, Pages, Awesome Lint, and search workflows.

Compose dist/roadmap/ into the repository's existing final site artifact at /roadmap/. The current Pages workflow remains the only deployer.

### Quest line

<!-- roadmap-step
id: AKA-Q01
status: complete
depends_on: []
issues: []
-->
#### AKA-Q01 — Launch the public knowledge portal

**State:** `complete`  
**Depends on:** None

**Outcome:** A large, curated resource collection is published through a healthy public site.

**Exit criteria:**

- [x] The resource catalog and site are publicly accessible.
- [x] Quality, Pages, Awesome Lint, and search workflows are green.

**Current evidence:**

- README reports 4,619 resources across 24 collections.
- Latest audited merge 29f72231b5e02b4fa94ac682ca68b717d61fadba followed green workflows on 2026-08-23.

<!-- roadmap-step
id: AKA-Q02
status: active
depends_on: [AKA-Q01]
issues: [34, 35, 36]
-->
#### AKA-Q02 — Promote the executable roadmap

**State:** `active`  
**Depends on:** `AKA-Q01`

**Outcome:** Issue #34 becomes the accepted roadmap source and reflects completed and open child work.

**Exit criteria:**

- [ ] Completed issues #35 and #36 are recorded as accepted evidence.
- [ ] Open children #37-#42 have owners, dependencies, and exit criteria.

**Current evidence:**

- Parent issue #34 contains a stronger plan than the checked-in ROADMAP.
- Issues #35 and #36 completed on 2026-08-23.

<!-- roadmap-step
id: AKA-Q03
status: ready
depends_on: [AKA-Q02]
issues: [39, 42]
-->
#### AKA-Q03 — Deliver stable identifiers and search

**State:** `ready`  
**Depends on:** `AKA-Q02`

**Outcome:** Resources keep durable identities and are discoverable through the issue #42 search experience.

**Exit criteria:**

- [ ] Issue #39 defines migration-safe stable identifiers.
- [ ] Issue #42 search supports documented relevance and empty-state behavior.

**Current evidence:**

- Issues #39 and #42 remain open.

<!-- roadmap-step
id: AKA-Q04
status: planned
depends_on: [AKA-Q03]
issues: [37, 38]
-->
#### AKA-Q04 — Add Atlas and legal legibility

**State:** `planned`  
**Depends on:** `AKA-Q03`

**Outcome:** Issues #37 and #38 make the collection navigable spatially and clear about licensing and attribution.

**Exit criteria:**

- [ ] Atlas links retain stable resource identity.
- [ ] License and attribution gaps are visible and block unsafe reuse where needed.

**Current evidence:**

- Issues #37 and #38 remain open.

<!-- roadmap-step
id: AKA-Q05
status: planned
depends_on: [AKA-Q03, AKA-Q04]
issues: [19, 40, 41]
-->
#### AKA-Q05 — Scale curation and visual storytelling

**State:** `planned`  
**Depends on:** `AKA-Q03`, `AKA-Q04`

**Outcome:** Issues #40 and #41 and infographic issue #19 expand content without weakening provenance or maintainability.

**Exit criteria:**

- [ ] Curation queues have ownership, freshness, and quality criteria.
- [ ] Visual outputs link to data sources and pass accessibility checks.

**Current evidence:**

- Issues #40, #41, and #19 remain open.
- Queue and design-system work landed in #50 and #51 on 2026-08-22.

### Roadmap-to-issue handoff

- A step is complete only when its exit criteria and required evidence are satisfied; commit count never determines progress.
- Ready steps without an issue are candidates for the private, duplicate-aware roadmap.issue-plan.json dry run. Planned steps remain preview-only unless a reviewer explicitly opts them in with issue_policy: propose.
- Issue creation or reconciliation requires human approval or an explicitly authorized Pace operation and returns issue references through a reviewable roadmap pull request.
- Pull requests and commits should include Roadmap-Step: <ID>; historical evidence may be linked through existing issue and pull-request relationships.
- Public rendering uses only allowlisted build-time evidence and never places a GitHub token or private issue plan in the browser artifact.

<!-- END ROADMAP EXECUTION SNAPSHOT -->

## Strategic context

This roadmap describes capability evolution, not promised dates or an issue queue. Sequence follows architecture dependencies and may change when evidence or risk changes.

## Phase 1: Harden collection standards

**Outcome:** A bounded capability advances from documented intent to validated, independently usable behavior.

**Exit signals:**

- The owning contract and acceptance criteria are versioned.
- Implementation and documentation agree.
- Relevant tests and safety checks pass.
- Downstream consumers and migration impact are understood.
- Remaining uncertainty is visible.

## Phase 2: Enrich geographic and domain coverage

**Outcome:** A bounded capability advances from documented intent to validated, independently usable behavior.

**Exit signals:**

- The owning contract and acceptance criteria are versioned.
- Implementation and documentation agree.
- Relevant tests and safety checks pass.
- Downstream consumers and migration impact are understood.
- Remaining uncertainty is visible.

## Phase 3: Add structured resource metadata

**Outcome:** A bounded capability advances from documented intent to validated, independently usable behavior.

**Exit signals:**

- The owning contract and acceptance criteria are versioned.
- Implementation and documentation agree.
- Relevant tests and safety checks pass.
- Downstream consumers and migration impact are understood.
- Remaining uncertainty is visible.

## Phase 4: Improve search and maps

**Outcome:** A bounded capability advances from documented intent to validated, independently usable behavior.

**Exit signals:**

- The owning contract and acceptance criteria are versioned.
- Implementation and documentation agree.
- Relevant tests and safety checks pass.
- Downstream consumers and migration impact are understood.
- Remaining uncertainty is visible.

## Phase 5: Automate sustainable review and publication

**Outcome:** A bounded capability advances from documented intent to validated, independently usable behavior.

**Exit signals:**

- The owning contract and acceptance criteria are versioned.
- Implementation and documentation agree.
- Relevant tests and safety checks pass.
- Downstream consumers and migration impact are understood.
- Remaining uncertainty is visible.

## Cross-cutting tracks

- Security, privacy, accessibility, licensing, and provenance.
- Documentation, architecture portals, examples, and onboarding.
- Packaging, release, compatibility, and self-hosting.
- Organization integration through explicit contracts.
- Observatory evidence and Pace conformance when those systems exist.

## Deferred direction

Optional managed services, enterprise controls, marketplaces, and the conversational organization compiler remain later architecture work. Current choices should preserve portability and avoid foreclosing them.

## Evidence and uncertainty

- **Observed:** The repository README and checked-in implementation establish a living constellation of curated, focused knowledge collections with an accessible discovery site.
- **Decided for this draft:** The repository owns the bounded concern described here and participates through versioned contracts.
- **Proposed:** Target systems and later roadmap phases remain proposals until accepted and implemented.
- **Open question:** Which parts of this draft should become active in the first independently versioned release?
