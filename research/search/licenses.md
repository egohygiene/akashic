# Search License and Artifact Ledger

## Status

This ledger is the license gate for Akashic search research. It records what the repository currently distributes, identifies plausible future runtimes and embedding models, and keeps every external candidate **not approved** until a later experiment pins and reviews the exact files it would execute or publish.

The machine-readable source is [`licenses.json`](licenses.json). Run `node scripts/validate-search-licenses.mjs` after changing it. A successful validation means the required provenance fields are present; it is not legal advice or an automatic approval decision.

## Current Distribution Boundary

Akashic currently ships no external model weights, tokenizer, semantic vector index, browser inference runtime, or generative model. The current search implementation is repository-authored lexical JavaScript. Its evaluation fixture and deterministic result checkpoints are also repository artifacts covered by Akashic's CC0 dedication.

The fixture and reports contain resource names, links, and factual catalog fields. They do not mirror or relicense the content, trademarks, datasets, or software at those destinations. The repository license cannot grant rights that Akashic does not own.

| Asset | Kind | Declared license | Distribution state |
| --- | --- | --- | --- |
| `site/search/` | Lexical source and reviewed concepts | CC0-1.0 | Shipped |
| `evaluations/natural-language-v1.json` | Akashic-authored evaluation data | CC0-1.0 | Shipped |
| `evaluations/natural-language-v2.json` | Akashic-authored graded evaluation extension and review provenance | CC0-1.0 | Shipped |
| `results/*.json` | Deterministic evaluation artifacts | CC0-1.0 | Shipped |
| External runtime, model, tokenizer, or converted weights | Separate third-party components | Varies | Not shipped |
| Static semantic embedding index | Future derived artifact | Undecided until its exact inputs are approved | Not shipped |

## Candidate Snapshot

These entries are a research shortlist, not a selection or recommendation. License evidence was checked from the linked primary project or model pages on 2026-09-02. Mutable pages are evidence for the snapshot only; adoption still requires an immutable revision.

| Candidate | Role | Declared license | Why it remains unapproved |
| --- | --- | --- | --- |
| [Transformers.js](https://github.com/huggingface/transformers.js) | Browser model runtime | Apache-2.0 | No pinned version, dependency/notice inventory, or measured justification. Runtime terms do not cover model files. |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) | Browser inference runtime | MIT | No pinned version or exact WebAssembly/WebGPU artifact inventory. Model files remain separate. |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | Possible browser vector runtime | Apache-2.0 OR MIT | No selected license or revision, and the flat typed-array baseline has not shown a need for it. |
| [WebLLM](https://github.com/mlc-ai/web-llm) | Optional future Navigator runtime | Apache-2.0 | Generation is outside the first semantic experiment; runtime and model approvals must remain separate. |
| [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | Compact 384-dimension baseline candidate | Apache-2.0 | Exact files are unpinned; the disclosed multi-dataset training mixture needs an independent provenance review; the model card does not claim Matryoshka prefixes. |
| [nomic-embed-text-v1.5](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) | Matryoshka embedding candidate | Apache-2.0 | Exact files are unpinned; custom-code, data-card, task-prefix, conversion, and browser-cost reviews remain open. |
| [bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) | Compact embedding baseline candidate | MIT | Exact files are unpinned; training provenance, ONNX conversion, tokenizer behavior, and browser cost remain unreviewed. |

An upstream model-card license is evidence about the released model repository. It does not collapse the separate questions of training-data provenance, base-model terms, tokenizer files, conversion code, compiled weights, runtime dependencies, or the legal status of model outputs.

## Component and Artifact Boundary

Every semantic experiment must treat these as separate reviewable components:

| Component | Required record before use or publication |
| --- | --- |
| Runtime code | Package/repository, immutable revision, license, notices, transitive dependencies, exact published files. |
| Model configuration and weights | Canonical repository, immutable revision, exact filenames, checksums, declared license, base-model lineage, intended use, limitations. |
| Tokenizer and vocabulary | Source, immutable revision, filenames, checksums, license evidence, normalization and truncation behavior. |
| Training and evaluation datasets | Dataset names, versions, licenses or terms, provenance limitations, personal/sensitive-data concerns, allowed use. A framework license never licenses every dataset it can load. |
| Conversion and quantization tools | Tool and revision, license, command/configuration, numeric format, transformation parameters, reproducibility evidence. |
| Converted or quantized model | Parent files and checksums, conversion provenance, output checksums, numerical-equivalence test, redistribution decision, required notices. |
| Static embedding index | Canonical Akashic input digest, model and tokenizer revisions, pooling/prefix rules, dimension, numeric representation, shard layout, checksum, explicit publication license decision. |
| Evaluation report | Fixture, catalog, algorithm/model, and artifact digests plus the repository license and any required third-party notices. |

Do not assume that generated embeddings are automatically CC0, automatically owned by the model provider, or automatically free of third-party obligations. Record the decision and its evidence for the exact model terms and inputs used. Until that review exists, semantic indexes and converted model artifacts are not approved for publication.

## Approval Gate

An external entry may move from `candidate` to `approved` only when one PR provides all of the following:

1. An immutable upstream revision and exact file manifest.
2. SHA-256 checksums for every downloaded or generated file.
3. License evidence for runtime code, weights, configuration, tokenizer, conversion tools, and redistributed derivatives.
4. A training-data and base-model provenance note that distinguishes known facts from gaps.
5. A generated notice bundle containing every required copyright, license, attribution, and modification statement.
6. Reproducible conversion or quantization commands and a numerical-equivalence check when artifacts are transformed.
7. Intended-use, limitation, privacy, accessibility, transfer-size, memory, and fallback review.
8. A deliberate decision about whether Akashic may host the artifact, must fetch it from its canonical owner, or must reject it.

Unknown or conflicting terms are a blocker, not permission. A successful HTTP fetch, permissive runtime license, model-card tag, or “open model” label cannot satisfy this gate alone.

## Maintenance

- Keep candidates unpinned and unapproved until an experiment actually selects one; do not imply that a mutable `main` branch or model page is reproducible.
- When selecting a candidate, replace `sourceRevision: null` with the immutable revision and narrow `coveredComponents` to the exact reviewed files.
- Recheck primary license evidence when a candidate is selected, when its upstream ownership or terms change, and before publishing a derived artifact.
- Preserve old experiment manifests and notices. A newer upstream license declaration does not retroactively describe an older revision.
- Add rejected candidates with the concrete reason when the rejection teaches a reusable licensing or deployment constraint.
