# Browser-Native Search and Navigator Architecture

## Status

This is a research architecture, not a promise that every described layer will ship. Each layer must justify its accessibility, maintenance, transfer, execution, and curation costs through Akashic-specific evaluation.

## Design Thesis

Akashic can perform meaningful natural-language retrieval without a hosted application backend. The target design lets GitHub Pages serve versioned static assets while document-side work occurs during a reproducible build and query-side work occurs in the visitor's browser. This is not yet a claim about the current deployment: its generated catalog and Atlas files include build timestamps and use stable, mutable filenames.

```text
Build time

Canonical Markdown
  -> parse and validate
  -> stable resource identity and structured metadata
  -> lexical fields and reviewed aliases
  -> document embeddings
  -> dimension truncation and numeric quantization
  -> static manifests, indexes, and optional search packs

Runtime

Question
  -> deterministic local query compiler
  -> lexical candidates
  -> optional local query embedding
  -> semantic candidates
  -> rank fusion and policy boosts
  -> cited resource pathways
  -> optional local explanation model
```

No runtime search service, vector-database server, inference API, account, API key, or per-query payment is required. The browser downloads code, indexes, and—when enabled—model assets from the same static publication boundary. This describes the target architecture: the current portal still writes searches into shareable `?q=` URL state, which can persist sensitive questions in browser history and reach the static host on a reload or shared link. Natural-language search must change that behavior before it can claim private-by-default handling.

## System Components

### Canonical corpus

Markdown remains the source of resource titles, URLs, descriptions, collections, groups, topics, and orientation text. A future metadata convention may add stable IDs, aliases, authority, access, geography, review state, sensitivity, and volatility without creating a second catalog.

Both resource cards and collection-guide passages may eventually become retrieval units. Resource cards answer “where can I go?” while guide passages answer “how does this system work?” Their identities and ranking roles should remain distinct.

### Build-time compiler

The compiler performs expensive work once:

1. validates canonical content;
2. emits stable, deterministic resource records;
3. constructs lexical fields and aliases;
4. embeds resource and guide text with a pinned model;
5. compresses and optionally shards vectors;
6. writes versioned manifests with model, dimension, quantization, license, and checksum information; and
7. runs retrieval evaluations before publication.

GitHub Actions can perform this work, but generated search artifacts should also be reproducible locally. Runtime correctness must not depend on a private build service.

### Local query compiler

The first query compiler should be deterministic. It can normalize text and derive a constrained record such as:

```json
{
  "intents": ["housing", "legal-help", "financial-assistance"],
  "urgency": "deadline-sensitive",
  "concepts": ["eviction notice", "tenant defense", "rental assistance"],
  "locationRequired": true,
  "accessPreferences": ["free", "official", "local"],
  "subqueries": [
    "eviction notice tenant legal help",
    "free eviction defense",
    "emergency rental assistance"
  ]
}
```

Curated rules, aliases, phrase recognition, and metadata can produce this before a language model is introduced. A future small local model may suggest additional subqueries or a hypothetical passage, following the HyDE and Query2doc research directions, but generated expansion is only a retrieval hint.

### Hybrid retriever

Dense vectors are not a replacement for lexical retrieval. Exact identifiers, agency names, statutes, form numbers, package names, and acronyms need precise token and phrase handling. Natural-language descriptions benefit from semantic similarity.

A future score can combine independently inspectable signals:

```text
final score =
    exact title and identifier score
  + weighted lexical score
  + semantic similarity
  + collection and topic intent score
  + official-source and Start Here boosts
  + geographic applicability score
  + access and urgency compatibility
  - stale, restricted, or mismatched penalties
```

Multiple subquery rankings can be combined using reciprocal rank fusion or another simple method before a more complex learned reranker is considered.

### Static vector index

For 4,169 resources and 384 dimensions, exhaustive comparison is small enough to be the default research baseline.

| Representation | Approximate raw resource-vector size |
|---|---:|
| Float32 | 6.1 MiB |
| Float16 | 3.1 MiB |
| Int8 | 1.5 MiB |
| Binary | 195 KiB |

These estimates exclude manifests, model weights, guide passages, and transport compression. They illustrate why Akashic should test flat typed arrays before adopting approximate-nearest-neighbor infrastructure.

Compression experiments should separate:

- **Dimensional truncation:** use a model trained for useful prefixes, following Matryoshka Representation Learning.
- **Numeric quantization:** compare Float32, Float16, Int8, and binary vectors.
- **Candidate reranking:** retrieve broadly with a compact representation and rerank a small set with richer lexical or vector information.
- **Sharding:** load only a core index or relevant domain/location pack when that improves low-bandwidth access without harming discovery.
- **Model quantization:** independently compress the optional query encoder or language model; vector and model quantization solve different problems.

### Deterministic pathway composer

Useful question answering does not require generation. Retrieved resources can be grouped from metadata into paths such as:

- Do this first.
- Understand the system or deadline.
- Find free or official help.
- Find state and local resources.
- Compare longer-term options.

This layer should ship before a conversational model because it is smaller, predictable, translatable, testable, and safer in high-stakes domains.

### Optional Akashic Navigator

The Navigator is a constrained local agent harness. It is not the catalog, retriever, policy engine, or source of facts.

```text
agent/
├── AGENT.md
├── manifest.json
├── specs/
├── skills/
├── schemas/
├── tools/
└── evaluations/
```

At runtime, code selects only the relevant specifications, skills, and retrieved evidence. Local JavaScript tools control search, resource lookup, Atlas ancestor traversal, grouping, and citation validation. The language model may classify, rewrite, or explain, but code validates its structured output and citations.

The model must be optional, explicitly enabled, replaceable, and accompanied by its download size, device requirements, license, privacy behavior, and fallback. Core search cannot depend on it.

## Progressive Capability Contract

| Level | Experience | Requirement |
|---|---|---|
| 0 | Canonical Markdown and static HTML | No JavaScript |
| 1 | Exact and lexical catalog search | Small local index |
| 2 | Natural-language semantic retrieval | Lazy embedding model and vectors |
| 3 | Deterministic guided pathways | Retrieval plus metadata and rules |
| 4 | Conversational local Navigator | Explicit model download on a capable device |
| 5 | Rich offline/domain packs | Storage and device capacity |

Lower capability levels are not punishment tiers. They must retain the same canonical resources, primary-source links, and essential safety context.

## Trust Boundaries

- The canonical repository is curated evidence, not guaranteed current truth.
- Linked external sites remain authoritative for their own current terms and controlling information.
- Search artifacts are derived and should become reproducible from canonical content, pinned implementations, and explicit publication metadata; the current general site build is not yet byte-for-byte reproducible.
- User queries may contain sensitive information. The current URL-backed query state is not private enough for high-stakes natural-language questions; question persistence and sharing should become explicit choices, with a local ephemeral default.
- Resource links use a no-referrer boundary, and future search work must preserve it, but browser history, copied URLs, screenshots, device sync, and local storage can still expose questions.
- Browser storage must not silently retain sensitive questions.
- Analytics, remote inference, and third-party query logging are outside the default architecture.
- Model output is untrusted until its structure and citations are validated.
- Retrieved descriptions can be stale or incomplete; high-stakes responses must preserve collection warnings and direct readers to controlling sources.
- A search result, model response, directory, hotline, intake, or form tool does not itself create eligibility, representation, or deadline protection.

## Evaluation Plan

Measure at least:

- Recall@k and mean reciprocal rank over human judgments.
- nDCG when judgments gain graded relevance.
- zero-result and misleading-result rates.
- exact-identifier and acronym precision.
- source-authority and geographic-applicability placement.
- latency on representative low-, middle-, and high-capability devices.
- first-load and repeat-load transfer sizes.
- peak memory and main-thread blocking.
- keyboard, screen-reader, reduced-motion, and mobile behavior.
- offline and failed-model fallbacks.
- safety-invariant violations through human review and targeted automated assertions.

The seed fixture is not statistically sufficient for a paper. It establishes the evaluation contract and exposes regressions while a larger, de-identified and deliberately sampled question set is developed.

## Experiment Order

1. Preserve the existing algorithm as an executable baseline.
2. Improve word boundaries, normalization, weighting, aliases, and deterministic query expansion.
3. Make natural-language query history and sharing privacy-preserving and explicit.
4. Establish stable resource IDs and richer metadata with issues #39 and #19.
5. Test a pinned browser embedding model with exhaustive Float32 search.
6. Compare Matryoshka dimensions and Int8/binary quantization.
7. Add hybrid fusion and Atlas ancestor applicability.
8. Explore guide/resource hierarchical retrieval inspired by RAPTOR.
9. Add a deterministic pathway composer.
10. Evaluate a small local model for query enhancement.
11. Evaluate an optional cited conversational layer only if it adds measurable value.

## Non-Goals

- Recreating a general web search engine.
- Mirroring or embedding the full contents of linked sites.
- Treating a chatbot as a professional or emergency service.
- Requiring WebGPU, a modern GPU, an account, or a large download for core navigation.
- Introducing a hosted vector database because it is conventional in commercial RAG stacks.
- Fine-tuning a model before retrieval failures and desired behavior are measured.
- Claiming research novelty before a literature review and comparative evaluation support it.

## Potential Paper Frame

A future paper could study **equitable static retrieval-augmented navigation**: whether carefully curated structure, progressive local inference, compressed retrieval representations, and deterministic policy tools can deliver useful knowledge navigation on low-resource devices without centralized query processing.

The contribution would not be “RAG in a browser” by itself. A stronger contribution would combine:

- a reproducible static architecture;
- progressive access across device capability;
- a public-resource retrieval dataset and safety evaluation;
- empirical compression and retrieval tradeoffs at realistic catalog scale;
- a constrained agent design that separates model interpretation from factual and policy authority; and
- documented negative results showing which commercial-stack complexity does not add value.
