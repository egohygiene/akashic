# Stable resource identity and metadata

Akashic Markdown remains the canonical catalog. Optional structured metadata extends a normal one-line Awesome entry with a trailing JSON comment; it does not create a second resource list.

```markdown
- [Example Service](https://example.gov/service) - Official service description. <!-- akashic-meta: {"id":"example-service","resourceType":"service","role":"service","authority":"official","access":["free"],"geography":["us-ma"],"language":["en-US"],"platform":["web"],"account":"required","license":"public-domain","status":"active","volatility":"medium","reviewTier":"semiannual"} -->
```

The comment must remain on the entry line, use valid JSON with double-quoted keys and strings, and appear after the description's final punctuation.

## Identity and URL changes

`id` is repository-owned identity. Use a short, descriptive, lowercase slug and never recycle or change it when a title, owner, or canonical URL changes. New entries should declare an explicit ID. Existing unannotated entries receive a deterministic transitional ID based on their title during the build, so the current catalog has stable identity without a 4,849-entry rewrite. When adding metadata to a legacy entry, copy its current generated `id` from `dist/data/catalog.json` unless a coordinated identity migration is intentional.

When a canonical URL changes:

1. Keep the resource `id` unchanged.
2. Replace the Markdown link with the new canonical HTTPS URL.
3. Add the former URL to `aliases`. Aliases may use HTTP when that was the historical address.
4. Do not keep the current URL in `aliases`.
5. Leave Atlas references in `atlas/applicability.json` on `resourceId`; do not replace them with URLs or move them into the place registry.

The portal stores saved resources by ID. On first schema-v2 load it converts saved current or former URLs to IDs. Atlas cross-posts also resolve by ID through the separately validated applicability manifest. This preserves saved state, Atlas applicability, and the identity expected by future `/resources/<id>/` pages when a URL moves.

## Controlled fields

All fields are optional except where the contribution policy requires an explicit ID. Unknown fields and values fail validation.

| Field | Shape | Allowed values or format |
| --- | --- | --- |
| `id` | string | Lowercase letters and numbers separated by single hyphens |
| `aliases` | array | Unique former HTTP(S) URLs |
| `resourceType` | string | `article`, `book`, `course`, `dataset`, `directory`, `documentation`, `journal`, `organization`, `platform`, `registry`, `repository`, `service`, `software`, `standard`, `tool`, `website`, `other` |
| `role` | string | `discovery`, `education`, `evidence`, `governance`, `reference`, `service`, `tool` |
| `authority` | string | `official`, `academic`, `nonprofit`, `community`, `commercial` |
| `access` | array | `free`, `freemium`, `paid`, `library`, `eligibility-based` |
| `geography` | array | `global`, a two-letter country code, or a stable Atlas-style path such as `us-ma` |
| `language` | array | BCP 47 language tags such as `en` or `en-US` |
| `platform` | array | `web`, `android`, `ios`, `linux`, `macos`, `windows`, `api`, `cli`, `desktop`, `mobile`, `self-hosted`, `in-person`, `browser-extension`, `other` |
| `account` | string | `none`, `optional`, `required`, `institutional` |
| `authorization` | array | `reference-only`, `isolated-lab`, `owned-systems`, `explicit-scope` |
| `operationalRisk` | string | `none`, `low`, `moderate`, `high` |
| `skillLevel` | string | `beginner`, `intermediate`, `advanced`, `mixed` |
| `artifactDomain` | array | `multi-domain`, `disk`, `filesystem`, `memory`, `network`, `browser`, `mobile`, `cloud`, `container`, `media`, `logs`, `malware` |
| `forensicRole` | array | `acquisition`, `preservation`, `examination`, `analysis`, `timeline`, `indexing-search`, `correlation-visualization`, `validation`, `case-management`, `reporting`, `education` |
| `supportType` | array | `advertising`, `directory`, `donation-platform`, `fiscal-hosting`, `grant`, `infrastructure`, `legal`, `maintenance`, `patent-defense`, `pledge`, `sponsorship` |
| `applicantType` | array | `buyer`, `company`, `community`, `foundation`, `individual`, `institution`, `maintainer`, `nonprofit`, `project`, `sponsor`, `varies` |
| `projectStage` | array | `idea`, `prototype`, `growing`, `maintained`, `mature`, `ecosystem`, `organization`, `varies` |
| `programCadence` | string | `rolling`, `continuous`, `periodic`, `cohort`, `fixed-call`, `invitation-only`, `upcoming`, `closed`, `varies` |
| `costModel` | array | `no-fee`, `host-fee`, `platform-fee`, `revenue-share`, `paid-service`, `membership-fee`, `in-kind`, `varies` |
| `obligation` | array | `application`, `milestones`, `reporting`, `public-deliverables`, `open-source-license`, `host-agreement`, `service-contract`, `membership-agreement`, `usage-limits`, `attribution`, `revenue-share`, `security-practices`, `none`, `varies` |
| `license` | string | `open-source`, `open-content`, `public-domain`, `proprietary`, `varies`, `unknown` |
| `status` | string | `active`, `archived`, `historical`, `experimental`, `deprecated` |
| `volatility` | string | `low`, `medium`, `high` |
| `reviewTier` | string | `annual`, `semiannual`, `quarterly`, `monthly` |
| `reviewed` | date | Date of the last human truth review, `YYYY-MM-DD` |
| `programChecked` | date | Date that a program's primary eligibility, cadence, cost, and obligation pages were checked, `YYYY-MM-DD` |
| `sensitive` | array | `medical`, `legal`, `financial`, `emergency`, `privacy`, `security`, `dual-use`, `crisis`, `youth`, `other` |
| `linkStatus` | string | `unknown`, `ok`, `redirected`, `unavailable`; requires `linkChecked` |
| `linkChecked` | date | Date of the automated or mechanical link check, `YYYY-MM-DD`; requires `linkStatus` |

`reviewed` means a person assessed the resource's claims, authority, access constraints, and continuing suitability. `linkStatus` only describes machine-observable availability. A successful link check must never be presented as a human truth review, and an outage must not silently delete a resource.

`programChecked` is narrower than `reviewed`: it records when a curator checked primary program pages for operational facts such as eligibility, application cadence, costs, and obligations. It is not a human truth review, endorsement, eligibility determination, or promise that a call remains open. The Open Source Sustainability and Support collection requires it because these facts change materially between calls.

`authorization` records the minimum permission context in which a resource belongs in the catalog: reading a reference, working in a deliberately isolated lab, assessing systems the learner owns, or operating under an explicit written scope. Multiple values may apply. `operationalRisk` describes the potential for harm if the resource is used outside that context; it is not a claim that authorized use is unsafe. `skillLevel` records the audience the resource is designed to support. These fields are required by collections that curate dual-use security resources, but remain optional for legacy entries elsewhere.

`artifactDomain` records the evidence or artifact families a forensic resource is designed to handle, while `forensicRole` records its place in a documented workflow. Both are multi-value fields because a suite can, for example, acquire memory and disk data, then examine and report on the result. They describe documented capabilities, not a claim of forensic soundness, legal admissibility, or fitness for a particular matter.

`supportType`, `applicantType`, `projectStage`, `programCadence`, `costModel`, and `obligation` make sustainability programs comparable without flattening grants, fiscal hosting, donations, infrastructure, commercial maintenance, or legal support into one generic funding label. They summarize the linked owner's current terms; the primary program page still controls.

Canonical metadata values remain in English in the current reference locale. Interface labels are localized separately; a future reviewed content overlay can use the stable ID.

## Incremental rollout

Do not mass-edit legacy entries only to add metadata. Require explicit identity and appropriate metadata for:

- new entries;
- resources cross-posted into Atlas;
- legal, medical, financial, emergency, privacy, security, crisis, youth, or dual-use resources;
- high-volatility services and resources with material access constraints.

Backfill other entries when a maintainer is already reviewing or updating them. The portal exposes facets only for records with the selected structured field; unannotated legacy records remain visible until a metadata filter is active.

Run `node scripts/validate-collection.mjs` to reject malformed metadata, duplicate IDs, invalid controlled values, stale aliases, and URL/alias collisions. Run `node scripts/build-site.mjs` and `node scripts/check-site.mjs` to verify generated identity, favorite migration contracts, portal facets, provenance, and Atlas associations.
