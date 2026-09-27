# Civic paperwork tasks

Issue [#123](https://github.com/egohygiene/akashic/issues/123) implements the Government Life Administration lane in [#40](https://github.com/egohygiene/akashic/issues/40). It covers Massachusetts RMV tasks and moving follow-through; [#149](https://github.com/egohygiene/akashic/issues/149) adds a bounded U.S. identity-document and voter-registration chapter. It is public navigation, not a transaction service or a personal case store.

## Architecture and canonical ownership

The readable task cards in `docs/civic/ma-rmv.md` and `docs/civic/us-identity.md` are canonical. Each card has one `civic-task` metadata comment, a stable heading, and a two-column operational table. `scripts/lib/civic-tasks.mjs` derives records conforming to `schemas/civic-task-v1.schema.json`; the ordinary site build publishes each registered chapter. The `CIVIC_CHAPTERS` registry binds canonical source, HTML template/output, derived data filename, and printable checklist anchor. Sources outside that registry are rejected; each chapter must contain its task router and checklist. Relative links resolve from the owning Markdown chapter and local fragments stay on the generated page. No generated files are committed.

| Canonical chapter | Generated page | Derived records | Checklist |
| --- | --- | --- | --- |
| `docs/civic/ma-rmv.md` | `civic.html` | `data/civic-tasks.json` | `i-moved-checklist` |
| `docs/civic/us-identity.md` | `identity.html` | `data/identity-tasks.json` | `paperwork-checklist` |

No runtime dependency, remote script, separate authored catalog, or per-city copy is introduced.

Public Services owns five official RMV references and four identity-document references, with short orientations. Massachusetts and United States Atlas pages link explicitly to their respective chapters; those links do not infer legal applicability or inherit to other places. Passport, voting, death-certificate, benefit, and court gateways retain their existing canonical homes; see [identity curation](civic/us-identity-curation.md) for the overlap audit and source conflicts. Existing benefits, legal, housing, and community resources remain in their canonical collections. The moving checklist references those collections instead of duplicating their records. Commercial vehicles, business accounts, international conversions, and case-specific suspension decisions are outside this passenger-license/Mass ID first edition; official pages route their exceptions.

## Task contract

- `id` is a permanent slug matching the card's Markdown heading anchor. Renaming a heading or ID is a deliberate link migration.
- `jurisdiction` is an explicit Atlas place ID, not a legal-applicability conclusion; `agency` identifies the responsible body.
- `intents` contain plain-language aliases; `transaction` names the official action. Channels describe the linked task, with eligibility and alternate-route limits in the card.
- Required rows cover the first check, record effect, document effect, transaction route, evidence, fee, timing, interim proof, completion evidence, and escalation. Operational rows include adjacent official source links. Unknown or variable fees/timing must say so, rather than imply zero or immediate completion.
- `prerequisites`, `follow_up`, and `do_not_confuse_with` reference other task IDs. A prerequisite is a check, not proof that a transaction applies to everyone. Unknown references, self-links, and prerequisite cycles fail validation.
- `source_urls` are derived from the card's links; there is no separately maintained source list. The schema intentionally preserves sourced Markdown narrative rather than pretending all eligibility rules are computable.
- `last_verified_at` means an agent checked public source content. `human_review` stays `pending`; successful retrieval must never be promoted to human truth review. `review_due_at` is an explicit calendar deadline, and `review_triggers` require earlier review for fee/form/channel changes, source conflict, or reported problems. The page shows both dates, and a browser enhancement flags overdue cards without changing build bytes.
- `privacy` is `public-guidance-only`. Only public task descriptions belong here. Never add addresses, license/SSN/account numbers, medical details, submitted forms, or personal progress to canonical or generated data.

The validator implements only the schema vocabulary used by this version and rejects unsupported keywords. Shape validation is followed by calendar-date, safe-link, source-citation, and task-graph checks. The build validates the declared jurisdiction against Atlas. Adding a field requires coordinated schema, parser, rendering, checks, and documentation changes.

## Reader behavior

All content, intent links, common confusions, and the chapter checklists are static HTML and readable without JavaScript. The task router uses ordinary fragment links; Back/Forward and copied task links use native browser behavior. Cards keep the first check, fees, timing, and prerequisite links visible while native disclosure controls hold the remaining steps. Printing expands every card and removes controls; a separate button prints only that chapter's checklist. A no-JavaScript visitor can use the browser's Print command with all cards already expanded.

Optional progress selects offer not started, waiting, blocked, and done. They are memory-only and reset on reload. No identifying text fields, storage, network writes, analytics, or agency submissions exist. A progress selection is the reader's reminder; it never establishes agency approval, a valid credential, or permission to drive. Print a copy to retain reminders privately. Theme and print controls are progressive enhancements. Both chapters are canonical English editorial content (`lang="en"`), like the existing English research pages; no unreviewed translated policy is generated.

## Acceptance and validation

The identity chapter must route vital-record copies, passport applications/renewals/loss/corrections, Social Security cards/names, and voter status/updates. It must include the prepare → verify → submit yourself → save confirmation → track → escalate checklist, jurisdiction and age/status limits, and offline/accessibility routes. `us` means national discovery scope, not universal rules or eligibility. No submissions, document uploads, private identifiers, or persistent case tracking belong in the chapter.

The RMV chapter must route the issue's credential, vehicle, moving, disability, suspension, permit, and road-test intents; distinguish record changes from reissue; preserve the separate license/Mass ID replacement paths; include the multi-agency moving checklist and contact routes; and expose source/check/review metadata. Each source-sensitive rule links to its official page.

Run `node --test`, collection validation, the pinned affected-list Awesome Lint wrapper, build, and generated-site checks. Check the hub with and without JavaScript, keyboard navigation, both themes, narrow viewports, direct task links/history, print, overdue warnings, and storage/network inspection. Existing catalog identities and Atlas records must remain intact. Keep the hub's content out of the main search payload and preserve existing performance gates.

## Reuse queue

Later bounded chapters can cover taxes, benefits recertification, public-record requests, jury duty, professional licenses, and municipal permits. Each needs its own official-source review, agency/evidence/channel distinctions, and scope decision; copying Massachusetts deadlines into another jurisdiction is not a migration strategy.
