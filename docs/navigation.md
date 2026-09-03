# Need-First Navigation and Collection Guides

Akashic keeps Markdown lists canonical while adding calmer ways to reach them. The portal does not maintain a second resource catalog: need paths compile to ordinary catalog queries, guide panels are generated from marked Markdown, taxonomy controls filter generated catalog fields, and related paths point back to canonical collections and topics.

## Collection Guide Convention

A top-level list may publish its orientation material in the portal by wrapping one coherent Markdown region:

```markdown
<!-- site-guide:start -->

> **Scope and safety:** Explain important limits.

## Contents

- [Orient First](#orient-first)

## Orient First

### The system in one view

| Layer | Question | What to verify |
| --- | --- | --- |
| Access | What is required? | Cost, eligibility, account, place, and currentness. |

<!-- site-guide:end -->
```

The builder removes the list's `Contents` block and safely renders headings, paragraphs, emphasis, links, blockquotes, lists, and tables. Relative Markdown links become source links on GitHub because the generated portal has no matching Markdown route. Unsupported or unsafe links and unbalanced markers fail the build.

Guide content should orient before it enumerates. Prefer:

1. scope, safety, and currentness limits;
2. a system map or decision table;
3. a few need- or situation-specific starting paths;
4. a minimum viable checklist; and
5. clear boundaries between information, directories, services, and qualified human help.

Guide prose remains canonical English content. On a localized route it is marked `lang="en"` until reviewed content overlays exist.

## Related Akashic Paths

Internal Markdown links under `## Related Akashic Collections` are converted into native portal paths when the target is a known collection, nested branch, or topic. Descriptions are not copied. Renaming a target heading therefore remains a reviewed URL and taxonomy change.

## Need-First Paths

`site/needs.js` defines a small set of situations using stable IDs, interface message keys, glyphs, and ordinary-language English queries. A need path must:

- describe a recognizable situation rather than an agency or product;
- route through the shared search kernel rather than pinning a duplicate list of resources;
- keep safety-critical wording in the canonical resource descriptions and collection guides;
- work with keyboard, touch, narrow screens, reduced motion, and both themes; and
- receive matching English and Russian interface messages.

The initial paths cover no income, food today, housing risk, court papers, lost identification, health care, work, caregiving, creating, business, and relocation.

## Native Taxonomy Navigation

Collection, branch, and topic selects operate on the same URL-backed `collection`, `branch`, and `section` state as cards, filters, the mind map, browser history, and related paths. Resource-card taxonomy labels are buttons that enter those same filters. Every generated topic must remain reachable without using the visual mind map.

## Weighted Lexical Search

`site/search/weighted-lexical-v2.js` is the active dependency-free browser search. It:

- normalizes Unicode, punctuation, case, apostrophes, and whitespace;
- removes a small set of nonsemantic English stop words;
- weights title, topic, branch, collection, description, and domain matches differently;
- expands reviewed concepts and exact aliases from `site/search/concepts-v1.js`;
- boosts `Start Here` resources only after a real lexical or reviewed-alias match;
- exposes opt-in score explanations without generating explanation objects during ordinary search; and
- uses deterministic source order for equal scores.

Concepts contain vocabulary and ranking aliases, not copied resource descriptions or generated facts. The frozen `and-substring-v1` module remains available for research comparison. Reproduce both reports with:

```sh
node scripts/build-site.mjs
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --verify research/search/results/and-substring-v1.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --algorithm site/search/weighted-lexical-v2.js --verify research/search/results/weighted-lexical-v2.json
node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v2.json --algorithm site/search/weighted-lexical-v2.js --verify research/search/results/weighted-lexical-v2-evaluation-v2.json
```

`explainResourceMatch` explains one resource against a query or compiled query. `searchResourcesWithExplanations` returns the first ten explained results by default and accepts an explicit positive limit. Both record matched query and concept terms, credited fields, boosts, coverage, thresholds, and exclusion reasons. They explain deterministic scoring behavior, not resource suitability or controlling facts. The 33-case v2 fixture is a regression tool, not proof of broad retrieval quality or safety. It extends the immutable eighteen-query seed with graded judgments, four query languages, explicit cohorts, assessment provenance, and a catalog-coverage gap. Query-relative known negatives expose specific over-broad matches, but unmarked results remain unjudged and the reported rate is not precision. Its current single-source judgments do not satisfy the two-independent-assessor rule; add independent assessments, adjudicate disagreements, and incorporate reviewed real questions and failure reports before making stronger claims.

For algorithms that expose query decomposition, the research evaluator also ranks every generated subquery to the configured depth and records the deduplicated union with the original candidates. It measures pool expansion and relevant or known-irrelevant candidate gains without assigning a fused order. These diagnostics do not affect portal search results.

## Private Query State and Explicit Sharing

Natural-language questions remain in page memory by default. Search typing, submission, filter changes, and browser Back/Forward never write the query to the URL, `history.state`, `localStorage`, or `sessionStorage`. The current in-memory query remains active while non-query explorer history changes.

When a visitor explicitly chooses **Copy search link**, the portal creates a link whose `q` value is encoded after the `#catalog` fragment. URL fragments are visible to anyone who receives the link but are not included in the HTTP request. The receiving page reads the query, renders the result, and replaces the fragment with the ordinary `#catalog` anchor. Existing `?q=` links remain supported as a compatibility input and are removed from the address bar after the first render. The share action does not mutate the visitor's current URL, and generic report links never include the question.

## Source, Review, and Presentation

Selected paths expose the canonical Markdown source and a dedicated resource-update issue form. Reports remain human-reviewed; they do not delete or rewrite catalog entries automatically.

The portal provides spacious cards by default, an optional compact layout, a text layout, and print rules. Visual QA should cover wide desktop, tablet, 320–430 pixel phones, English and Russian routes, keyboard-only use, both themes, reduced motion, deep links, browser Back/Forward, wide guide tables, empty searches, and long translated labels.
