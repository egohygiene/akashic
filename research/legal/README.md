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

Run the contract check from the repository root:

```sh
node scripts/validate-legal-source-snapshots.mjs
node --test test/legal-source-snapshots.test.mjs
```

## Reviewed source evidence

The schema and fixtures were grounded in first-party pages observed on 2026-09-04:

- [GovInfo Developer Hub](https://www.govinfo.gov/developers) documents API and bulk access to self-describing packages, including CFR and Federal Register collections. The API requires an `api.data.gov` key; this PR does not acquire content or require credentials.
- [GovInfo authentication](https://www.govinfo.gov/about/authentication) explains its digitally signed PDF evidence, while [digital preservation](https://www.govinfo.gov/about/digital-preservation) and [policies](https://www.govinfo.gov/about/policies) describe archival preservation, permanent public access, and the public-domain rule plus possible third-party copyright exceptions.
- [eCFR API documentation](https://www.ecfr.gov/developers/documentation/api/v1) exposes the developer surface. The [OFR/GPO legal-status explanation](https://www.ecfr.gov/reader-aids/government-policy-and-ofr-procedures/about-this-site) says eCFR content is authoritative but unofficial and directs legal researchers to the official CFR, daily Federal Register, and LSA.
- [FederalRegister.gov API documentation](https://www.federalregister.gov/developers/documentation/api/v1) is the designated programmatic interface; automated page access can be challenged, so acquisition planning must use documented APIs and respect access controls.
- The Massachusetts Legislature identifies its online [General Laws](https://malegislature.gov/Laws/GeneralLaws) and [Session Laws](https://malegislature.gov/Laws/SessionLaws) as unofficial versions and publishes explicit current-through observations. Its [terms and conditions](https://malegislature.gov/StateHouse/TermsAndConditions) restrict copying of copyrighted website material beyond fair use and warn about third-party claims.
- The Massachusetts [Trial Court Law Libraries](https://www.mass.gov/orgs/trial-court-law-libraries) provide public legal-reference pathways. They are evidence for later source-pack coverage, not an acquisition endpoint in these fixtures.

## Deliberate boundary of this PR

Version 1 currently validates checked-in synthetic artifacts only. The next bounded #87 slices should add:

1. deterministic acquisition plans and dry-run diffs with no network mutation;
2. apply-time response capture, immutable snapshot creation, correction/supersession behavior, and unavailable-source reporting; and
3. deterministic Aether public-evidence export after the versioned Aether packet contract exists.

No private employment facts, documents, derived queries, credentials, or real legal text belong in fixtures, diagnostics, plans, or pull requests.
