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

Those values describe this small, deliberately curated regression fixture only. They do not establish general search quality, comparative superiority, user outcomes, or safety. The nineteen query-relative negative judgments are partial probes rather than an exhaustive labeling of the result set: an unmarked result is unjudged, not relevant or irrelevant. The suite now contains one Spanish query but still lacks meaningful multilingual coverage, graded relevance, assessor agreement, and enough cases to estimate general over-broad-result rates.

The same versioned module exposes a deterministic query-decomposition record with matched intent IDs, explicit urgency signals, a conservative unresolved place or postal-code span, explicit access needs, and at most six inspectable subqueries. It also exposes opt-in per-result explanations that account for matched query and concept terms, every score-bearing field, exact-query and reviewed-priority boosts, original-term coverage, the coverage multiplier, the result threshold, and exclusion reasons. Ordinary portal search keeps the allocation-light scoring path; detailed evidence is generated only when requested. The evaluator verifies explanations for every top-ten result and persists the full breakdown for the first result per query so checkpoint diffs remain reviewable.

The evaluator also ranks all 36 generated subqueries independently to depth ten and deduplicates their candidates with the original top ten. On the expanded seed, decomposition produces a mean candidate pool of `13.3333` resources—`4.8889` additional candidates per case. It adds one judged-relevant candidate for the uninsured-doctor query and one known negative for `AO 240`. That creates measurable fusion headroom, but one positive case does not justify a portal ranking change; decomposition still does not change result order.

The compiler does not infer a legal deadline, eligibility, geographic applicability, or an access constraint that the query did not state. Its initial signal vocabulary is English-only.

The seed uses binary URL-level relevance judgments: a reviewer selects existing canonical resources that should be discoverable for each question and records safety properties the eventual result presentation must preserve. Each case also names at least one existing catalog resource that is known to be irrelevant to that exact query. The runner reports how many of those partial known negatives appear at `k`, the first such rank, and the mean per-case known-irrelevant rate. Lower is better, but this measurement is not precision because resources outside the explicit negative set remain unjudged. It must be read beside recall and zero-result measurements: an algorithm that returns nothing trivially avoids known negatives. The runner measures retrieval only; it does not automatically certify safety properties. The suite has no graded relevance, assessor-agreement measurement, or statistical power, so it must not support comparative or safety-performance claims until those are added through a documented multi-reviewer protocol.

## Repository Map

```text
research/search/
├── README.md
├── architecture.md
├── BIBLIOGRAPHY.bib
├── licenses.json
├── licenses.md
├── references.md
├── evaluations/
│   └── natural-language-v1.json
└── results/
    ├── and-substring-v1.json
    └── weighted-lexical-v2.json
```

- `BIBLIOGRAPHY.bib` is the portable citation source for a future paper.
- `references.md` explains why each source matters and distinguishes papers, preprints, specifications, and software.
- `licenses.md` records the distribution boundary and approval gate; `licenses.json` is its machine-validated asset ledger.
- `architecture.md` records the current system hypothesis, progressive capability contract, trust boundaries, and experiment order.
- `evaluations/` contains human-reviewed query fixtures rather than generated claims.
- `results/` contains deterministic reports created by the evaluation runner.

## Reproduce the Checkpoints

Run from the repository root:

```sh
node scripts/build-site.mjs
node scripts/validate-search-licenses.mjs
node scripts/evaluate-search.mjs --verify research/search/results/and-substring-v1.json
node scripts/evaluate-search.mjs --algorithm site/search/weighted-lexical-v2.js --verify research/search/results/weighted-lexical-v2.json
```

Optional runner arguments are `--algorithm`, `--catalog`, `--fixture`, `--output`, `--verify`, and `--top-k`. A report identifies its catalog, fixture, and exact algorithm source with SHA-256 digests and intentionally omits a timestamp so unchanged inputs and an unchanged versioned algorithm produce an unchanged file. The repository declares Node.js 20 or newer so the browser and runner can share ECMAScript modules without environment-dependent syntax detection. `and-substring-v1` is frozen; a new search implementation receives a new module, algorithm ID, and result file.

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

The next implementation should stress-test and explain the non-ML kernel before choosing an embedding model:

1. obtain additional human review and expand the hard cohort across more collections, ambiguous terms, languages, and cases with measurable recall headroom;
2. define a no-fusion acceptance gate before testing reciprocal-rank or other fusion, requiring relevant-candidate and ranking gains without unacceptable known-negative growth;
3. record latency on low-end mobile hardware and transfer-size behavior;
4. apply the documented license and artifact gate to any model selected for a semantic experiment; and
5. preserve negative results and aliases that create unacceptable false positives.

Only after that baseline is understood should the project add static document embeddings and compare Matryoshka dimensions and numeric quantization.
