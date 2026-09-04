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
- Aether export compatibility pinned to an immutable contract revision and schema digest.

Snapshot lifecycle values are `historical`, `current`, `stale`, `corrected`, `superseded`, `repealed`, `unavailable`, and `unknown`. Updates add a new snapshot and link it through `supersedes` or `corrects`; they never rewrite an earlier cited artifact. A repealed snapshot carries a separate status, effective-date record, public authority evidence when confirmed, and notes without inventing a replacement snapshot. Unavailable sources have no invented bytes. Unknown dates and rights remain null or unknown.

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

## Deterministic Aether export

[`aether-public-evidence-v1.lock.json`](aether-public-evidence-v1.lock.json) pins `aether.cross-agent-evidence-packet/v1` to Aether merge commit `d92da857dcc96edef1efc6b99a7f938e3f48c0d0` and the SHA-256 digest of its exact schema. Compatible legal-source manifests repeat the contract version, immutable revision, and schema digest; a mismatch fails closed.

[`export-legal-source-evidence.mjs`](../../scripts/export-legal-source-evidence.mjs) validates the source manifest and checked-in artifacts, selects one captured snapshot, and emits a canonical public-evidence packet. The packet includes raw and normalized attachment digests, exact normalized byte spans, transformation and tool provenance, jurisdiction and authority metadata, rights constraints, review and freshness state, limitations, and a canonical envelope digest.

Generate the federal fixture packet as JSON:

```sh
node scripts/export-legal-source-evidence.mjs \
  --manifest "research/legal/fixtures/us-federal-govinfo-cfr-v1.json" \
  --format "json"
```

Use `--snapshot` to select a non-current captured snapshot and `--destination` to narrow the declared destination scope. The command writes only to standard output. It performs no network request, destination admission, file mutation, transport, tool execution, or capability grant. Aether policy and session admission remain a separate receiver-side operation.

## Federal and Massachusetts employment-separation pack

[`us-federal-ma-employment-separation-v1.json`](packs/us-federal-ma-employment-separation-v1.json) is the first bounded source pack built on the snapshot contract. It inventories 21 federal and Massachusetts starting points across benefits, discrimination, filing and deadlines, leave, personnel records, releases and waivers, unemployment, and wage payment. Each record keeps jurisdiction, material type, authority, publisher, rights, dates, currentness, availability, inclusion rationale, limitations, metadata review, human-review state, and integrity evidence separate.

Version 1 deliberately distinguishes:

- official primary sources from official guidance, services, forms, self-help, and official secondary research guides;
- legal editions from authoritative or official-publisher web presentations that are not themselves legal editions;
- current, mixed, unknown, and historical source conditions;
- metadata reviewed during curation from still-pending human approval; and
- sources with immutable synthetic citation proofs from real-source records that remain metadata-only pending source-specific rights and acquisition review.

The pack does not contain private employment facts, real agreements, names, uploaded documents, derived user queries, or real legal text. Its four evaluation questions are synthetic and require jurisdiction separation, exact citations, date checks, conflicting-source handling, and visible uncertainty. It makes no comparative legal finding.

Validate and export the pack as one deterministic Aether packet:

```sh
node scripts/export-legal-source-pack-evidence.mjs \
  --pack "research/legal/packs/us-federal-ma-employment-separation-v1.json" \
  --format "json"
```

The packet attaches the complete reviewed inventory plus the two existing immutable federal and Massachusetts synthetic citation proofs. Citation records bind exact byte spans and survive packet export. The export is read-only, public-only, unsigned, pending human review, and grants no capability or transport authority.

Compare two valid versions and report added, changed, stale, unavailable, and superseded sources deterministically:

```sh
node scripts/refresh-legal-source-pack.mjs \
  --baseline "research/legal/packs/us-federal-ma-employment-separation-v1.json" \
  --candidate "research/legal/packs/us-federal-ma-employment-separation-v1.json" \
  --as-of "2026-09-04" \
  --format "text"
```

Any reported change requires human review. Refresh does not fetch a page, overwrite a snapshot, submit a form, calculate a deadline, or promote a secondary source over primary authority.

### Version 1 employment-pack acceptance audit

The bounded pack covers #88's version 1 contract:

- an explicit federal and Massachusetts private-sector employment-separation baseline across all eight requested subjects;
- 21 reviewed source records with jurisdiction, authority, publisher, rights, dates, currency, availability, integrity, inclusion, and omission metadata;
- durable distinctions among official primary, unofficial presentation, guidance, form or service, self-help, historical, and secondary materials;
- two pinned immutable synthetic snapshot proofs with exact normalized citation spans that survive deterministic packet export;
- a history-preserving refresh policy and deterministic added, changed, stale, unavailable, and superseded report;
- four synthetic evaluations covering citation, date, jurisdiction, source conflict, and uncertainty behavior;
- a public-only privacy boundary with no private employment facts, names, documents, queries, form submissions, or real legal text; and
- mandatory human review before coverage expansion, comparative claims, or legal use.

Case-law treatment, real-source byte acquisition, public-sector and collective-bargaining systems, local law, industry-specific rules, and comprehensive plan or tax analysis remain visible omissions rather than implied coverage.

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

The employment-separation pack was additionally reviewed against first-party pages observed on 2026-09-04:

- [United States Code](https://uscode.house.gov/), [GovInfo CFR](https://www.govinfo.gov/app/collection/CFR), [eCFR](https://www.ecfr.gov/), and the [Federal Register](https://www.federalregister.gov/) provide distinct codified-law, legal-edition, continuously updated unofficial, and rulemaking-history routes. Version 1 inventories the United States Code, GovInfo CFR, and Federal Register; eCFR remains a documented candidate for the next coverage review rather than being silently treated as equivalent to the CFR legal edition.
- Department of Labor [termination](https://www.dol.gov/general/topic/termination), [COBRA](https://www.dol.gov/general/topic/health-plans/cobra), and [Worker.gov](https://www.worker.gov/) pages supply official guidance and navigation, not controlling legal text.
- EEOC's [severance-waiver technical assistance](https://www.eeoc.gov/laws/guidance/qa-understanding-waivers-discrimination-claims-employee-severance-agreements) identifies its July 15, 2009 issue date and nonbinding status. Its [charge-filing page](https://www.eeoc.gov/filing-charge-discrimination) distinguishes federal, state or local, and federal-employee processes and warns that filing windows exist without supplying a universal deadline; the separate [official form index](https://www.eeoc.gov/selected-eeoc-forms) keeps Form 5 and related documents distinct from filing guidance and portal submission.
- The Massachusetts Legislature's [General Laws](https://malegislature.gov/Laws/GeneralLaws), [Session Laws](https://malegislature.gov/Laws/SessionLaws), [wage-payment section](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section148), [personnel-record section](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter149/Section52C), [employment-discrimination section](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter151b/Section4), and [unemployment chapter](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXXI/Chapter151A) remain separate records with the site's unofficial status and observed current-through date visible.
- Massachusetts official service routes include the Attorney General's [workplace complaint](https://www.mass.gov/how-to/file-a-workplace-complaint), DUA's [unemployment application](https://www.mass.gov/how-to/apply-for-unemployment-insurance-benefits), [MCAD](https://www.mass.gov/orgs/massachusetts-commission-against-discrimination), the [PFML overview](https://www.mass.gov/info-details/paid-family-and-medical-leave-pfml-overview-and-benefits), [458 CMR 2.00](https://www.mass.gov/regulations/458-CMR-200-family-and-medical-leave), and the Trial Court Law Libraries' [employment research guide](https://www.mass.gov/law-library/massachusetts-law-about-employment-and-employment-leave). Forms and services can receive private information, so Akashic records their public metadata but never invokes them or stores submitted data.

## Version 1 acceptance audit

Version 1 now covers the complete #87 evidence boundary:

- versioned, jurisdiction-aware source and snapshot manifests;
- explicit authority, date, currency, provenance, rights, integrity, review, and privacy state;
- historical, current, stale, corrected, superseded, repealed, unavailable, and unknown lifecycle representation;
- deterministic no-write planning and digest-bound immutable apply;
- raw-to-normalized artifact linkage through checked bytes, hashes, and transformations;
- federal and Massachusetts synthetic source conditions;
- deterministic export accepted by Aether's own public-evidence packet validator; and
- credential-free diagnostics containing no private facts or user queries.

Network acquisition, legal interpretation, destination admission, and transport remain deliberately outside this evidence-manifest contract.

No private employment facts, documents, derived queries, credentials, or real legal text belong in fixtures, diagnostics, plans, or pull requests.
