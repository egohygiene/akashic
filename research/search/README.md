# Akashic Search Research

This directory preserves the research, architecture, evaluations, and experiment results for a browser-native Akashic Search Kernel and optional Akashic Navigator. The work is tracked in [GitHub issue #42](https://github.com/egohygiene/akashic/issues/42) and is intended to remain portable into the Beacon research-paper workflow.

## Research Question

Can a static, privacy-preserving system built from a small browser-side embedding model, compressed resource embeddings, hybrid lexical and semantic ranking, structured curation, and deterministic agent tools provide most of the practical value of a hosted retrieval-augmented application for a public-resource catalog?

The hypothesis is deliberately narrower than “run a general chatbot in GitHub Pages.” Akashic should first become excellent at retrieving and organizing its own reviewed evidence. Generative behavior is optional.

## Published Lexical Checkpoints

The first seed suite contains ten ordinary-language and exact-identifier queries with human-judged relevant resources. The current `and-substring-v1` portal algorithm:

- returns no results for nine of ten queries;
- finds a judged resource for one query in the top ten;
- places the official IRS EIN application fourth for `IRS EIN`; and
- produces unrelated matches because `irs` can occur inside words such as `first` and `wheelchair`.

These results are a baseline, not a release gate. The fixture is intentionally small and should grow through reviewed real-world questions, failure reports, and stratified coverage across collections.

The active `weighted-lexical-v2` experiment normalizes query text, weights catalog fields, removes a small stop-word set, and applies reviewed ordinary-language concepts and exact aliases. On the same ten-query seed fixture it:

- returns results for all ten queries;
- places at least one judged resource first for every query;
- retrieves all 31 judged resource-query pairs in the top ten; and
- records mean Recall@10 and mean reciprocal rank of `1.0` on this seed.

Those values describe this small, deliberately curated regression fixture only. They do not establish general search quality, comparative superiority, user outcomes, or safety. In particular, the current suite lacks negative judgments, graded relevance, multilingual queries, assessor agreement, and enough coverage to detect over-broad result sets.

The seed uses binary URL-level relevance judgments: a reviewer selects existing canonical resources that should be discoverable for each question and records safety properties the eventual result presentation must preserve. The runner measures retrieval only; it does not automatically certify those safety properties. The suite presently has no graded relevance, explicit negative judgments, assessor-agreement measurement, or statistical power, so it must not support comparative or safety-performance claims until those are added through a documented multi-reviewer protocol.

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

1. expand the fixture across collections, short queries, ambiguous terms, known negatives, and multilingual input;
2. add per-result match explanations and explicit over-broad-query measurements;
3. compare concept expansion with deterministic query decomposition and rank fusion;
4. record latency on low-end mobile hardware and transfer-size behavior;
5. apply the documented license and artifact gate to any model selected for a semantic experiment; and
6. preserve negative results and aliases that create unacceptable false positives.

Only after that baseline is understood should the project add static document embeddings and compare Matryoshka dimensions and numeric quantization.
