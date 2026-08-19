# Annotated Search Research References

`BIBLIOGRAPHY.bib` is the portable citation source. This document records why each item matters to Akashic and prevents software documentation, standards, peer-reviewed results, and preprints from being treated as equivalent evidence.

## Representation and Compression

- [Matryoshka Representation Learning](https://arxiv.org/abs/2205.13147) — **NeurIPS 2022.** Trains coarse-to-fine embedding prefixes so a deployment can trade representation size and retrieval cost against quality. Akashic should compare full embeddings with 64-, 128-, 256-, and 384-dimensional prefixes only when the selected model was actually trained for this property.
- [MiniLM](https://arxiv.org/abs/2002.10957) — **NeurIPS 2020.** Demonstrates task-agnostic Transformer compression through self-attention distillation. It motivates using a compact query encoder rather than assuming browser retrieval needs a large language model.
- [RaBitQ](https://doi.org/10.1145/3654970) — **ACM SIGMOD 2024.** Explores one-bit-per-dimension vector quantization with an error bound and efficient distance estimation. Akashic can use it as a research comparison, although exhaustive Int8 search is a much simpler initial implementation.
- [Practical and Asymptotically Optimal Quantization of High-Dimensional Vectors](https://doi.org/10.1145/3725413) — **ACM SIGMOD 2025.** Extends RaBitQ to flexible bits per dimension. This is future-facing evidence for adjustable static-index size and accuracy.

## Lexical, Dense, and Late-Interaction Retrieval

- [Sentence-BERT](https://aclanthology.org/D19-1410/) — **EMNLP-IJCNLP 2019.** Establishes efficient sentence-level embedding comparison with a bi-encoder architecture. It is foundational to the proposed document-at-build/query-in-browser split.
- [SPLADE](https://doi.org/10.1145/3404835.3463098) — **ACM SIGIR 2021.** Learns sparse lexical expansion. It offers a possible future bridge between semantic retrieval and inspectable term-based indexes, but should be compared against curated aliases before adding a new model.
- [ColBERTv2](https://aclanthology.org/2022.naacl-main.272/) — **NAACL 2022.** Uses compressed token-level late interaction to improve retrieval quality while reducing its larger index footprint. It is most relevant if Akashic expands from resource cards into a much larger passage corpus.
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) — **NeurIPS 2020.** A foundational RAG reference. Akashic deliberately separates its useful retrieval architecture from any requirement to generate an answer.
- [Reciprocal Rank Fusion](https://doi.org/10.1145/1571941.1572114) — **ACM SIGIR 2009.** A simple method for merging independent rankings. It is a strong first candidate for combining exact, lexical, semantic, and multi-query results without a trained reranker.

## Query Enhancement

- [Precise Zero-Shot Dense Retrieval without Relevance Labels](https://aclanthology.org/2023.acl-long.99/) — **ACL 2023.** Introduces Hypothetical Document Embeddings (HyDE), where generated hypothetical text is embedded to locate real documents. Any Akashic adaptation must treat the hypothetical text as an untrusted search hint.
- [Query2doc](https://aclanthology.org/2023.emnlp-main.585/) — **EMNLP 2023.** Expands queries with generated pseudo-documents and reports improvements for sparse and dense retrieval. It motivates local prompt enhancement but does not show that a browser SLM is necessary or sufficient for Akashic.
- [Multi-query Multi-passage Late Fusion Retrieval](https://aclanthology.org/2025.findings-naacl.367/) — **Findings of NAACL 2025.** Generates subqueries and pseudo-documents, retrieves them independently, and fuses the rankings. Its decomposition maps well to an explainable query compiler, even if Akashic initially generates subqueries through deterministic rules.

## Hierarchical Retrieval

- [RAPTOR](https://openreview.net/forum?id=GN921JHCRw) — **ICLR 2024.** Recursively clusters, summarizes, and embeds text into a retrieval tree. Akashic already has collection, group, topic, guide, resource, and location hierarchy, so a restrained adaptation may retrieve at multiple levels without reproducing the paper's entire summarization pipeline.

## Browser and Small-Model Agents

- [WebLLM](https://arxiv.org/abs/2412.15803v2) — **Revised 2026 preprint and open-source system.** Demonstrates language-model inference entirely in browsers using WebGPU and WebAssembly. It supports the feasibility of an optional local Navigator, not the decision to load one by default.
- [The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits](https://arxiv.org/abs/2402.17764) — **Research preprint.** Studies ternary model weights and a training approach designed for lower inference cost. It is future-facing rather than an immediately interchangeable quantization option for arbitrary existing models.
- [1-bit AI Infra: Fast and Lossless BitNet b1.58 Inference on CPUs](https://arxiv.org/abs/2410.16144) — **Research preprint and software system.** Provides a CPU inference stack for ternary BitNet models. It is relevant to eventual low-resource local agents but separate from vector-index quantization.
- [Small Language Models are the Future of Agentic AI](https://arxiv.org/abs/2506.02153) — **Position paper/preprint.** Argues that narrow repetitive agent tasks often fit specialized small models and heterogeneous orchestration. Akashic should test that proposition rather than treating it as settled evidence.

## Primary Software and Standards

- [Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/main/en/guides/webgpu) — **Software documentation.** Shows browser feature-extraction pipelines and WebGPU execution. Pin the runtime and model revision before experimentation.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) — **Software documentation.** Documents WebAssembly and hardware-accelerated browser inference options. Feature support must be detected at runtime rather than assumed.
- [WebGPU specification](https://www.w3.org/TR/webgpu/) — **W3C specification.** Defines the browser GPU API. The static experience must preserve a non-WebGPU path.
- [sqlite-vec WebAssembly documentation](https://alexgarcia.xyz/sqlite-vec/wasm.html) — **Pre-1.0 software documentation.** Shows that vector search can run inside browser SQLite, while also documenting additional extension-build complexity. It is not needed for the first flat index.
- [WebLLM repository](https://github.com/mlc-ai/web-llm) — **Open-source implementation.** A candidate runtime for optional local generation experiments after retrieval and device fallbacks are established.

## Citation and Licensing Notes

- Publication access does not grant permission to redistribute model weights, tokenizers, datasets, or compiled artifacts.
- “Open model” is ambiguous; record the exact license for code, configuration, weights, tokenizer, and training data where available.
- Browser runtime licenses and model licenses are independent.
- Record model revision hashes, conversion tools, quantization parameters, and checksums in every experiment manifest.
- Preserve the distinction between peer-reviewed findings, workshop or findings papers, preprints, position papers, standards, and product documentation in any eventual literature review.
