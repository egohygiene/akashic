# Akashic Search Research

This directory preserves the research, architecture, evaluations, and experiment results for a browser-native Akashic Search Kernel and optional Akashic Navigator. The work is tracked in [GitHub issue #42](https://github.com/egohygiene/akashic/issues/42) and is intended to remain portable into the Beacon research-paper workflow.

## Research Question

Can a static, privacy-preserving system built from a small browser-side embedding model, compressed resource embeddings, hybrid lexical and semantic ranking, structured curation, and deterministic agent tools provide most of the practical value of a hosted retrieval-augmented application for a public-resource catalog?

The hypothesis is deliberately narrower than “run a general chatbot in GitHub Pages.” Akashic should first become excellent at retrieving and organizing its own reviewed evidence. Generative behavior is optional.

## Published Lexical Checkpoints

The expanded seed suite contains eighteen ordinary-language and exact-identifier queries with human-judged relevant resources. The eight-case hard cohort adds short and underspecified queries, compact identifier variants, implicit need language, an explicit access constraint, an acronym-only query, and one Spanish query. The frozen `and-substring-v1` portal algorithm:

- returns no results for fourteen of eighteen queries;
- finds a judged resource for three queries in the top ten;
- records mean Recall@10 of `0.0972` and mean reciprocal rank of `0.0814`; and
- still produces unrelated matches because character substrings such as `ein` can occur inside unrelated words.

These results are a baseline, not a release gate. The fixture is intentionally small and should grow through reviewed real-world questions, failure reports, and stratified coverage across collections.

The active `weighted-lexical-v2` experiment normalizes query text, weights catalog fields, removes a small stop-word set, and applies reviewed ordinary-language concepts and exact aliases. On the expanded fixture it:

- returns results for seventeen of eighteen queries;
- places a judged resource in the top ten for eleven queries;
- records mean Recall@10 of `0.5694` and mean reciprocal rank of `0.618`; and
- surfaces fourteen of nineteen explicitly judged known-irrelevant URL-query pairs in the top ten.

Those values describe the historical v1 regression fixture only. They do not establish general search quality, comparative superiority, user outcomes, or safety. The nineteen query-relative negative judgments are partial probes rather than an exhaustive labeling of the result set: an unmarked result is unjudged, not relevant or irrelevant.

The same versioned module exposes a deterministic query-decomposition record with matched intent IDs, explicit urgency signals, a conservative unresolved place or postal-code span, explicit access needs, and at most six inspectable subqueries. It also exposes opt-in per-result explanations that account for matched query and concept terms, every score-bearing field, exact-query and reviewed-priority boosts, original-term coverage, the coverage multiplier, the result threshold, and exclusion reasons. Ordinary portal search keeps the allocation-light scoring path; detailed evidence is generated only when requested. The evaluator verifies explanations for every top-ten result and persists the full breakdown for the first result per query so checkpoint diffs remain reviewable.

The evaluator also ranks all 36 generated subqueries independently to depth ten and deduplicates their candidates with the original top ten. On the expanded seed, decomposition produces a mean candidate pool of `13.3333` resources—`4.8889` additional candidates per case. It adds one judged-relevant candidate for the uninsured-doctor query and one known negative for `AO 240`. That creates measurable fusion headroom, but one positive case does not justify a portal ranking change; decomposition still does not change result order.

The first fusion experiment, `decomposition-rrf-v1`, combines the original-query and distinct decomposition rankings with reciprocal rank fusion at depth ten and the conventional rank constant `60`. Its explanation record identifies every contributing query, input rank, reciprocal-rank contribution, and underlying lexical match evidence. Before running it, `fusion-no-harm-v1` fixed ten acceptance checks: at least one new case with relevant results in the top ten; no loss in mean recall or mean reciprocal rank; no added zero-result case; no lost previously successful case; no first-relevant-rank or exact-identifier regression; and no aggregate or per-case growth in observed known negatives.

The candidate did not clear that gate. It raises cases with a judged-relevant result in the top ten from eleven to twelve by recovering the uninsured-doctor case at rank six, raises mean Recall@10 from `0.5694` to `0.5833`, and lowers observed known-negative hits from fourteen to eleven. However, mean reciprocal rank falls from `0.6180` to `0.5926`; three first-relevant ranks regress, including the acronym-only exact-identifier case; and the federal fee-waiver form-number case gains a known-negative result in the top ten. The committed decision therefore keeps `weighted-lexical-v2` active. This is a result on the small seed fixture, not evidence that reciprocal rank fusion is generally harmful.

## Stratified v2 Checkpoint

`akashic-natural-language-v2` imports the immutable eighteen-case v1 seed and adds fifteen cases without copying or redefining it. The resulting suite has 33 cases: 32 catalog-covered retrieval evaluations and one explicit catalog gap for `MassHealth PT-1`. It covers four query languages—29 English, two Spanish, one Russian, and one French—and adds accessibility, housing instability, technology-facilitated abuse, employment, offline/low-capability software, student-loan, child-care, mobility-equipment, tax-assistance, and local-control cohorts.

The v2 protocol grades each judged resource from `0` (known irrelevant) through `3` (direct primary pathway), treats grades `2` and `3` as relevant for binary metrics, records every assessment source, and requires exact agreement from at least two independent assessors before the corpus can support comparative claims. The current 133 judgments each have one versioned source, so exact agreement is deliberately `null`, zero cases meet the independent-assessor minimum, and the report marks agreement as insufficient. Pull-request approval reviews the artifact, but it is not silently counted as a second per-resource assessment.

On the 32 evaluable v2 cases:

- frozen `and-substring-v1` finds a judged-relevant result in four cases, with mean Recall@10 `0.0859`, MRR `0.0770`, and nDCG@10 `0.0693`;
- active `weighted-lexical-v2` succeeds in eighteen cases, with mean Recall@10 `0.5052`, MRR `0.4895`, and nDCG@10 `0.4592`;
- the active scorer surfaces 25 of 34 deliberately selected known-negative probes in the top ten, showing substantially more over-broad-result evidence than v1 exposed; and
- the Russian and French cases remain zero-result cases, while the Spanish legal-help case succeeds and the Spanish food case retains its earlier behavior.

The unchanged `fusion-no-harm-v1` gate still rejects `decomposition-rrf-v1` on v2. Fusion gains one top-ten success and lowers known-negative exposure by three, but MRR falls by `0.0189`, nDCG@10 falls by `0.0150`, six first-relevant ranks regress, one exact-identifier rank regresses, and the federal fee-waiver case still gains a known negative. `weighted-lexical-v2` therefore remains the portal ranking.

The compiler does not infer a legal deadline, eligibility, geographic applicability, or an access constraint that the query did not state. Its initial signal vocabulary is English-only.

Portal queries now remain ephemeral and local by default. Ordinary search actions never write a question to the URL, browser history state, or storage. An explicit copy action creates a fragment-encoded search link, and the receiving page consumes and sanitizes that fragment after rendering. Legacy `?q=` links remain a read-only compatibility input. This improves the local trust boundary without claiming that a deliberately copied link, device screen, or recipient is private.

The Phase 1 performance track now has an explicit `weighted-lexical-performance-v1` budget. The active scorer scans word ranges inside the normalized field strings instead of splitting every field for every query term. This removes hot-path token-array allocation without retaining a second token representation in memory, and it does not change scores or result order. The committed static report measures the exact generated catalog-page assets and records both raw bytes and deterministic gzip/Brotli encoding proxies. At 5,112 resources, the lexical runtime group is `549215` gzip bytes or `422776` Brotli bytes; the full catalog-page bootstrap group is `597903` gzip bytes or `463983` Brotli bytes. These are encoded-size proxies, not observations of GitHub Pages cache headers, CDN negotiation, or repeat-view transfer.

The benchmark also times catalog parsing, index construction, and every query in the reviewed fixture under a normal Node.js profile and a JIT-disabled stress profile. CI enforces deliberately loose regression ceilings and runs whenever lists or portal assets change. In the committed same-environment Node.js references, the allocation-free scan changes the standard-profile median from `46.2952` to `20.6467` milliseconds and p95 from `139.9900` to `75.4503` milliseconds while the observed index heap delta remains in the same approximate range. Those two runs support the optimization direction but are not a device-independent speedup or memory claim.

Environment-tagged reference reports are preserved separately from the deterministic static report because elapsed time and heap observations are machine-dependent. The JIT-disabled profile is a stress proxy, not a low-end phone emulator; representative browser/device measurements, main-thread blocking, and first-load versus repeat-load network captures remain required before making a mobile responsiveness claim.

The published `search-lab.html` turns that next evidence step into a repeatable, browser-native workflow without introducing a framework, test service, analytics endpoint, or second query corpus. It builds from the materialized canonical v2 fixture, runs only those public questions, yields to the event loop between searches, and exports an environment-tagged JSON report only after an explicit download action. The report separates a unique same-origin `cache: "reload"` catalog request from an ordinary repeat request, preserves the browser's Resource Timing fields when available, observes `longtask` entries through feature detection, and records coarse device, viewport, connection, visibility, and memory capabilities. Unsupported APIs remain `null` or explicitly unavailable rather than becoming false zero measurements. A separate deterministic budget bounds the complete opt-in lab run—including its catalog and public fixture—at the current `584258` gzip-byte and `452127` Brotli-byte encoding proxies.

The browser report is intentionally not committed as a universal checkpoint: elapsed time, task scheduling, network delivery, cache state, thermal state, and memory observations depend on the device and run conditions. Useful evidence should preserve the complete report, repeat measurements on each target, and compare low-, middle-, and high-capability hardware with matching context. The lab never accepts user-entered questions, persists a report, or sends results anywhere; the downloaded report still contains browser and device characteristics and should be inspected before a contributor shares it.

The v1 seed uses binary URL-level relevance judgments. V2 maps those inherited relevant judgments conservatively to grade `2`, preserves their query-relative negatives as grade `0`, and adds native graded judgments for its new cases. The runner now reports Recall@k, MRR, nDCG@k, partial known-negative exposure, language/cohort coverage, catalog gaps, assessment counts, exact agreement when measurable, and whether the independent-review minimum is satisfied. Lower known-negative exposure is better, but it is not precision because resources outside the explicit judgment set remain unjudged. It must be read beside recall and zero-result measurements: an algorithm that returns nothing trivially avoids known negatives. Retrieval metrics do not automatically certify safety invariants, and the current single-source judgments remain insufficient for paper-level comparative or safety claims.

## Repository Map

```text
research/search/
├── README.md
├── architecture.md
├── BIBLIOGRAPHY.bib
├── licenses.json
├── licenses.md
├── references.md
├── algorithms/
│   └── decomposition-rrf-v1.js
├── evaluations/
│   ├── fusion-no-harm-v1.json
│   ├── natural-language-v1.json
│   ├── natural-language-v2.json
│   └── performance-budget-v1.json
└── results/
    ├── and-substring-v1.json
    ├── and-substring-v1-evaluation-v2.json
    ├── decomposition-rrf-v1-decision.json
    ├── decomposition-rrf-v1-decision-v2.json
    ├── decomposition-rrf-v1.json
    ├── decomposition-rrf-v1-evaluation-v2.json
    ├── weighted-lexical-v2-jitless-reference-v1.json
    ├── weighted-lexical-v2-performance-v1.json
    ├── weighted-lexical-v2-pre-word-scan-reference-v1.json
    ├── weighted-lexical-v2-standard-reference-v1.json
    ├── weighted-lexical-v2.json
    └── weighted-lexical-v2-evaluation-v2.json
```

- `BIBLIOGRAPHY.bib` is the portable citation source for a future paper.
- `references.md` explains why each source matters and distinguishes papers, preprints, specifications, and software.
- `licenses.md` records the distribution boundary and approval gate; `licenses.json` is its machine-validated asset ledger.
- `architecture.md` records the current system hypothesis, progressive capability contract, trust boundaries, and experiment order.
- `algorithms/` contains research candidates that are not deployed by the portal.
- `evaluations/` contains versioned query fixtures, graded judgments, review provenance, and acceptance gates rather than generated claims.
- `results/` contains deterministic evaluation and acceptance-decision reports.

## Reproduce the Checkpoints

Run from the repository root:

```sh
node scripts/build-site.mjs
node scripts/validate-search-licenses.mjs
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --verify research/search/results/and-substring-v1.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --algorithm site/search/weighted-lexical-v2.js --verify research/search/results/weighted-lexical-v2.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --algorithm research/search/algorithms/decomposition-rrf-v1.js --verify research/search/results/decomposition-rrf-v1.json
node scripts/compare-search-results.mjs --baseline research/search/results/weighted-lexical-v2.json --candidate research/search/results/decomposition-rrf-v1.json --gate research/search/evaluations/fusion-no-harm-v1.json --verify research/search/results/decomposition-rrf-v1-decision.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v2.json --verify research/search/results/and-substring-v1-evaluation-v2.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v2.json --algorithm site/search/weighted-lexical-v2.js --verify research/search/results/weighted-lexical-v2-evaluation-v2.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v2.json --algorithm research/search/algorithms/decomposition-rrf-v1.js --verify research/search/results/decomposition-rrf-v1-evaluation-v2.json
node scripts/compare-search-results.mjs --baseline research/search/results/weighted-lexical-v2-evaluation-v2.json --candidate research/search/results/decomposition-rrf-v1-evaluation-v2.json --gate research/search/evaluations/fusion-no-harm-v1.json --verify research/search/results/decomposition-rrf-v1-decision-v2.json
node scripts/benchmark-search.mjs --profile standard --static-verify research/search/results/weighted-lexical-v2-performance-v1.json
node --jitless scripts/benchmark-search.mjs --profile jitless --timing-only
```

Optional runner arguments are `--algorithm`, `--catalog`, `--fixture`, `--output`, `--verify`, and `--top-k`; the default fixture is v2. A report identifies its catalog, materialized fixture, and exact algorithm source with SHA-256 digests and intentionally omits a timestamp so unchanged inputs and an unchanged versioned algorithm produce an unchanged file. The repository declares Node.js 20 or newer so the browser and runner can share ECMAScript modules without environment-dependent syntax detection. `and-substring-v1` is frozen; a new search implementation receives a new module, algorithm ID, and result file.

The performance runner accepts `--algorithm`, `--budget`, `--catalog`, `--fixture`, `--profile`, `--warmup-passes`, `--measurement-passes`, `--output`, `--static-output`, `--static-verify`, and `--timing-only`. Only the static asset report is byte-verifiable across machines. Timing reports identify their Node.js, operating-system, architecture, CPU, configuration, and input digests and should be compared only with that environment context intact.

The committed report is a Git-versioned corpus checkpoint, not a generated ledger that every resource-only change must rewrite. Its catalog digest identifies the exact snapshot; check out the commit that recorded a report when reproducing it after the catalog has evolved. Search-research changes rerun the checkpoint in CI, and intentional corpus refreshes must regenerate and review the report. Pull-request CI also prevents edits to the published v1 algorithm so later work adds a new version instead of silently redefining the baseline.

## Research Discipline

- Treat paper results as prior evidence, not proof that a technique will help Akashic.
- Measure retrieval quality, transfer size, latency, memory, accessibility, privacy, and failure behavior together.
- Preserve negative results and rejected complexity.
- Keep Markdown useful without JavaScript.
- Keep lexical search as a universal fallback.
- Load semantic and generative assets only through progressive enhancement.
- Never use generated text as the source of legal, medical, financial, crisis, eligibility, or deadline facts.
- Verify model weights, tokenizer, dataset, runtime, and redistribution licenses independently before vendoring artifacts.
- Keep every external search asset unapproved until the license ledger records an immutable revision, exact component coverage, checksums, notices, and a deliberate hosting decision.

## Next Experiment

The next implementation should strengthen the evidence and runtime measurements before choosing an embedding model:

1. obtain at least two independent per-resource assessments for the v2 cases, adjudicate grade disagreements explicitly, and prioritize multilingual and safety-sensitive cohorts;
2. use the browser Search Lab on representative low-, middle-, and high-capability devices, preserving repeated main-thread, memory, and first-load/repeat-load reports rather than treating Node.js or compression proxies as device evidence;
3. investigate whether exact-query preservation or another simple fusion variant can address the six v2 rank regressions, but only against the unchanged acceptance gate;
4. close the explicit `MassHealth PT-1` catalog gap through a separately reviewed canonical-resource change;
5. apply the documented license and artifact gate to any model selected for a semantic experiment; and
6. preserve negative results and aliases that create unacceptable false positives.

Only after that baseline is understood should the project add static document embeddings and compare Matryoshka dimensions and numeric quantization.
