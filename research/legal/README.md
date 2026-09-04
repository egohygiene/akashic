# Versioned legal-source snapshots

This directory defines Akashic's public-evidence boundary for acquiring and preserving legal-source snapshots. A manifest records where evidence came from, what was observed, how bytes changed, and what remains uncertain. It does not decide which law controls, whether a source applies to a person, or what anyone should do.

## Version 1 contract

[`legal-source-snapshot-v1.schema.json`](schemas/legal-source-snapshot-v1.schema.json) is the portable structural schema. [`legal-source-snapshots.mjs`](../../scripts/lib/legal-source-snapshots.mjs) enforces the cross-field and filesystem invariants that JSON Schema alone does not establish.

Every manifest records:

- stable manifest, jurisdiction, and authority-type identity;
- issuing body, publisher, canonical URL, acquisition endpoint, formats, languages, accessibility, and content bounds;
- publisher, content-authority, and authentication status without inferring one from another;
- acquisition mode, method, tool version, request parameters, and expected response type;
- per-snapshot response status, retrieval time, media type, and captured body/header digests;
- rights, terms, redistribution, and quotation status, including an explicit fail-closed `unknown` path;
- publication, amendment, effective, current-through, retrieval, review, and expiration dates as known, unknown, or not applicable;
- raw and normalized artifact paths, byte lengths, SHA-256 digests, signature evidence, and deterministic transformation links;
- parser compatibility, source availability, known limitations, and historical lifecycle relationships;
- freshness triggers that require review rather than silently replacing evidence;
- pending or completed human review for authority, currency, rights, and content bounds;
- a public-only privacy boundary with no private facts or user queries and no authority granted by source content; and
- Aether export status without inventing compatibility before Aether issue 70 publishes its packet version.

Snapshot lifecycle values are `historical`, `current`, `stale`, `corrected`, `superseded`, `unavailable`, and `unknown`. Updates add a new snapshot and link it through `supersedes` or `corrects`; they never rewrite an earlier cited artifact. Unavailable sources have no invented bytes. Unknown dates and rights remain null or unknown.

## Synthetic proof fixtures

The checked-in federal and Massachusetts fixtures contain invented citations and text. They exercise materially different official-source conditions without redistributing real legal content:

- [`us-federal-govinfo-cfr-v1.json`](fixtures/us-federal-govinfo-cfr-v1.json) models GovInfo's official, archival CFR distribution. It records authentication as available but does not claim that the synthetic artifact has a signature. Its unknown publication, amendment, effective, and current-through dates remain explicit.
- [`us-ma-general-laws-v1.json`](fixtures/us-ma-general-laws-v1.json) models the Massachusetts Legislature's online General Laws. The publisher is official, while the page itself identifies the online text as unofficial and gives a May 31, 2026 current-through date. Its website-rights constraints remain separate from any later artifact-specific legal-text review.

The fixture artifacts are small JSON files under [`fixtures/artifacts/`](fixtures/artifacts/). Validation recomputes their byte lengths and SHA-256 digests, then verifies every normalized output against its raw input and named transformation.

## Deterministic acquisition planning

[`legal-source-observation-v1.schema.json`](schemas/legal-source-observation-v1.schema.json) represents public response metadata supplied to a dry run. Observations contain status, time, media type, body length, response hashes, and a controlled failure code—but no response body, credentials, private facts, or user queries. Non-synthetic plans block unexpected media types rather than treating an error page as new legal evidence.

[`legal-source-acquisition-plan-v1.schema.json`](schemas/legal-source-acquisition-plan-v1.schema.json) binds a plan to canonical manifest, request, and observation digests. Request parameters and comparison fields are sorted. The planner distinguishes `acquire`, `no-change`, `create-snapshot`, `record-unavailable`, and fail-closed `blocked` decisions. A proposed snapshot requires a later manifest apply; planning never edits an existing snapshot.

Generate a human-readable changed-body dry run:

```sh
node scripts/plan-legal-source-acquisition.mjs \
  --manifest "research/legal/fixtures/us-federal-govinfo-cfr-v1.json" \
  --observation "research/legal/fixtures/observations/us-federal-govinfo-cfr-changed-v1.json" \
  --format "text"
```

Omit `--observation` to review the acquisition request definition before any observation exists. Use `--format "json"` for the versioned machine-readable plan. Both modes report and enforce zero network requests, file writes, and manifest mutations.

## Digest-bound apply

[`legal-source-apply-v1.schema.json`](schemas/legal-source-apply-v1.schema.json) binds a reviewed apply request to the exact manifest, dry-run plan, observation, staged raw response, and normalized outputs. Every staged file is rehashed before use. A changed response requires an explicit `supersedes` or `corrects` choice, creates new artifact paths, adds a new snapshot, and moves only lifecycle metadata on the prior snapshot. Existing artifact paths are never overwritten.

An unavailable observation instead appends an `unavailable` event with no body or transformation claims. It does not replace the most recent captured snapshot. This preserves the last citable evidence while making the outage and its review date explicit.

Preview the checked-in synthetic apply proof:

```sh
node scripts/apply-legal-source-acquisition.mjs \
  --manifest "research/legal/fixtures/us-federal-govinfo-cfr-v1.json" \
  --observation "research/legal/fixtures/observations/us-federal-govinfo-cfr-changed-v1.json" \
  --request "research/legal/fixtures/apply/us-federal-govinfo-cfr-changed-v1.json" \
  --format "text"
```

Preview is the default and performs no writes. `--apply` is the explicit mutation boundary: after revalidation it creates the new artifacts with exclusive-create semantics and atomically replaces only the selected manifest. The validator exercises that write path in an isolated repository copy; the checked-in fixture command above should remain a preview.

Run the contract check from the repository root:

```sh
node scripts/validate-legal-source-snapshots.mjs
node --test test/legal-source-snapshots.test.mjs
```

## Reviewed source evidence

The schema and fixtures were grounded in first-party pages observed on 2026-09-04:

- [GovInfo Developer Hub](https://www.govinfo.gov/developers) documents API and bulk access to self-describing packages, including CFR and Federal Register collections. The API requires an `api.data.gov` key; the checked-in proof does not acquire content or require credentials.
- [GovInfo authentication](https://www.govinfo.gov/about/authentication) explains its digitally signed PDF evidence, while [digital preservation](https://www.govinfo.gov/about/digital-preservation) and [policies](https://www.govinfo.gov/about/policies) describe archival preservation, permanent public access, and the public-domain rule plus possible third-party copyright exceptions.
- [eCFR API documentation](https://www.ecfr.gov/developers/documentation/api/v1) exposes the developer surface. The [OFR/GPO legal-status explanation](https://www.ecfr.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site) says eCFR content is authoritative but unofficial and directs legal researchers to the official CFR, daily Federal Register, and LSA.
- [FederalRegister.gov API documentation](https://www.federalregister.gov/developers/documentation/api/v1) is the designated programmatic interface; automated page access can be challenged, so acquisition planning must use documented APIs and respect access controls.
- The Massachusetts Legislature identifies its online [General Laws](https://malegislature.gov/Laws/GeneralLaws) and [Session Laws](https://malegislature.gov/Laws/SessionLaws) as unofficial versions and publishes explicit current-through observations. Its [terms and conditions](https://malegislature.gov/StateHouse/TermsAndConditions) restrict copying of copyrighted website material beyond fair use and warn about third-party claims.
- The Massachusetts [Trial Court Law Libraries](https://www.mass.gov/orgs/trial-court-law-libraries) provide public legal-reference pathways. They are evidence for later source-pack coverage, not an acquisition endpoint in these fixtures.

## Deliberate boundary of this PR

Version 1 validates checked-in synthetic artifacts, observations, deterministic no-write plans, and digest-bound apply requests. It proves immutable artifact creation, correction/supersession behavior, atomic manifest replacement, and unavailable-source persistence without performing network acquisition. Remaining #87 closeout work is an acceptance audit (including explicit repeal representation) and deterministic Aether public-evidence export after the versioned Aether packet contract exists.

No private employment facts, documents, derived queries, credentials, or real legal text belong in fixtures, diagnostics, plans, or pull requests.
