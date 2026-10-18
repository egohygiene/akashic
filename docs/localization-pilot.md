# Bounded content-localization pilot

The content-overlay system gives translated discovery labels and Atlas place names one source-bound path without duplicating the English catalog. This pilot supplies AI-generated candidates for all five existing non-English locales: Russian (`ru`), Spanish (`es`), French (`fr`), Brazilian Portuguese (`pt-BR`), and Arabic (`ar`). It adds no locales.

All 180 authored fields are **AI drafts pending human language review**. None is published into runtime labels or search aliases. Existing interface translations remain available; canonical English content remains the fallback. Implementation, machine validation, and AI self-checking do not constitute human language review.

This work implements the contract and presentation paths for [#178](https://github.com/egohygiene/akashic/issues/178), the bounded discovery pilot in [#179](https://github.com/egohygiene/akashic/issues/179), and the five-place Atlas path in [#180](https://github.com/egohygiene/akashic/issues/180). The original Russian pilot is included within the same inventory for the five already supported non-English locales. Actual public translation coverage remains empty until people review individual candidates.

## Inventory fixed before drafting

[`localization/pilot-inventory-v1.json`](../localization/pilot-inventory-v1.json) records the exact targets, source paths, rationale, excluded fields, and source revision before translation drafting. It intentionally selects eight topics, below the ten-topic ceiling, and three existing need paths. The source revision is [`ecb665fc49e302fdbae83a6016355b1a51a6edac`](https://github.com/egohygiene/akashic/commit/ecb665fc49e302fdbae83a6016355b1a51a6edac).

| Entity | Targets per locale | Fields | Rationale |
| --- | ---: | --- | --- |
| Collection | 2 | Label and aliases | Work/learning and no-cost resources are useful discovery entry points with different nesting patterns. |
| Topic | 8 | Label and aliases | Exercise work, material support, music, animation, and learning without translating resource facts. |
| Need path | 3 | Label and aliases | Reuse the existing work, creating, and food-today paths and their canonical English queries. |
| Place | 5 | Label and short label | Exercise the existing world, country, state, and locality hierarchy without changing geography. |
| Total | 18 | 36 fields | The same bounded inventory applies to all five locales, producing 180 fields. |

The collections are `work-and-learning` and `awesome-abundance`.

| Collection | Canonical group | Canonical topic |
| --- | --- | --- |
| `work-and-learning` | Empty root group | Career Platforms and Job Search |
| `work-and-learning` | Empty root group | Remote Paid Work and Expert Services |
| `work-and-learning` | Empty root group | Remote and International Work |
| `work-and-learning` | Empty root group | Learning and Careers |
| `awesome-abundance` | `community-sharing-and-material-resources` | Food and Household Essentials |
| `awesome-abundance` | `creative-tools-and-production` | Music Production and Recording |
| `awesome-abundance` | `creative-tools-and-production` | Video, Motion, and Animation |
| `awesome-abundance` | `education-and-learning` | General Learning |

Topic identity is the exact serialized tuple `[collectionSlug, groupSlug, sectionTitle]`; its English title remains part of the canonical identity. A display translation must never replace the tuple or enter a filter URL as a new topic identifier.

Need targets are `work`, `creating`, and `food-today`. Each alias binds to the existing need query from `site/needs.js`. The need label binds to both that query and its English title message; changing either invalidates the candidate's source binding.

Place targets are `world`, `us`, `us-ca`, `us-ma`, and `us-ma-wilmington`. Their English labels are World, United States, California, Massachusetts, and Wilmington, Massachusetts. Short labels come from each canonical `shortName`, including Wilmington for the locality. Localized text is presentation only: it neither creates a second place nor changes an identifier, boundary, parent, jurisdiction, source association, or applicability edge.

## Authored candidates and publication

[`localization/content-overlays-v1.json`](../localization/content-overlays-v1.json) is the authored candidate file. Each field records:

- A stable overlay ID, registered target locale, canonical target kind and ID, field, and candidate text or aliases.
- The full source commit revision, exact canonical source fields, and deterministic source fingerprint from `fingerprintCanonical` in `scripts/lib/content-overlays.mjs`.
- Transparent AI translator provenance (`OpenAI Codex`) and `status: "draft"`.

There are no human reviewer records in this initial candidate file. Translating an interface locale earlier does not approve its content overlays. Russian's reference-interface status also grants no content-review exemption.

The validator compares every source binding with the current parsed canonical catalog, needs, and Atlas. The build publishes only entries that have a recorded human language review and still match their source fields. Draft, withdrawn, stale, and missing-target entries cannot enter the runtime projection. A changed English field makes the overlay stale even if its old fingerprint remains internally valid.

The deterministic review report explains the effective status of each field. Generate and verify it after building current canonical data:

```sh
node scripts/build-site.mjs
node scripts/validate-content-overlays.mjs
node scripts/validate-content-overlays.mjs --verify
```

The initial report should show 180 draft fields, zero published fields, zero stale fields, and zero orphaned fields. A machine-generated report is evidence of status and source matching, not a language-quality certification. Keep raw drafts and reviewer metadata out of generated public runtime data.

## Human review and later publication

Review fields individually in a pull request against the exact English source and the rendered context. A person must assess meaning, ordinary terminology, ambiguity, accessible labels, mixed English text, place identity, and length on narrow screens. Arabic needs right-to-left and mixed-script checks. Aliases need an additional retrieval check: they may bridge vocabulary only to the existing canonical entity or need query.

A reviewer should revise or reject inaccurate candidates rather than approving a language as one batch. After the person has reviewed an exact field, record their identity and actual review date using the schema's human review object, including `fingerprintTranslation(entry)` for the exact reviewed value and provenance, and change that field to `reviewed`. Label, aliases, and short label are separate fields; reviewing one does not approve the others. Never fabricate a reviewer or infer approval from successful tests, a PR merge, interface status, or an AI audit.

If the canonical source changed, compare and update the translation before replacing its source fields, revision, and fingerprint. Recomputing a fingerprint alone does not reapprove a stale translation. Withdraw an unsuitable field explicitly; the runtime will retain canonical English. Rerun validation, the deterministic report check, the site checks, and relevant rendered and retrieval checks after review changes.

Alias tests may construct a synthetic reviewed projection in memory to exercise the publication path. That fixture must remain separate from authored provenance and must not promote any checked-in AI draft. Draft aliases have no effect on public ranking.

## Controlled discovery measurement

The versioned fixture at `research/search/evaluations/localization-discovery-v1.json` contains 12 Russian or mixed-script cases with positive resource judgments, known negatives, ambiguity, and an exact-identifier guard. Its separate controlled projection exercises hypothetical publication; it does not approve the authored drafts. Reproduce the deterministic before/after report after building:

```sh
node scripts/evaluate-localization.mjs --verify-report research/search/results/localization-discovery-v1.json
```

At top ten, the controlled bridge finds 10 of 10 positive resource judgments versus 3 before mapping. It also exposes two of ten known-negative judgments, versus zero before mapping, because broad canonical collection and need queries inherit the frozen ranker's false positives. These are disclosed limitations, not a production search-quality pass or evidence that arbitrary Russian queries are translated. Nine cases map explicit complete phrases; three exercise guards. Full ordered rankings for all 46 English regression cases across the two immutable corpora remain unchanged. The existing algorithms, corpora, judgments, and no-harm gates are unchanged.

The actual publication section of the same report shows 180 drafts, zero published aliases, and no public query changes. Human review must assess vocabulary and these retrieval limitations before approving any alias field. A reviewed label does not implicitly approve its aliases.

## Deliberate limits

Resource titles and descriptions, collection descriptions and guides, advisories, and Atlas themes remain English. Resource URLs and stable IDs remain canonical. Discovery aliases contain no resource facts, access promises, eligibility rules, legal conclusions, or new resource selections. They do not translate arbitrary queries or imply that matching external resources are available in the selected interface language.

The interface language, a displayed place name, and an external resource's recorded source languages are separate. Atlas language indicators use explicit resource metadata; absent or unsupported metadata stays unknown. A translated place label must never imply that a linked site offers the same language.

No live translation provider, personal search text, browser-language history, location lookup, or network service is part of this offline drafting and review flow. Further target expansion requires another explicit inventory and review, rather than translating the rest of the catalog implicitly.
