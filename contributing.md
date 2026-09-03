# Contribution Guidelines

Thank you for helping this collection become more useful. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Repository Structure

akashic is organized as a collection of focused Awesome lists:

```
README.md                    ← collection hub and index
contributing.md              ← these guidelines
lists/
  artificial-intelligence/README.md
  awesome-abundance/
    README.md               ← nested collection hub
    */README.md             ← focused no-cost resource lists
  business-and-entrepreneurship/README.md
  claims-conspiracies-and-epistemic-navigation/README.md
  commerce-and-marketplaces/README.md
  containers-and-cloud/README.md
  creative-resources/README.md
  cryptocurrency-and-digital-assets/README.md
  dark-web-deep-web-and-anonymous-networks/README.md
  design-systems-and-branding/README.md
  developer-tools/README.md
  digital-forensics-and-incident-evidence/README.md
  gaming-ecosystem-and-preservation/README.md
  hacking-and-cybersecurity/README.md
  health-and-well-being/README.md
  legal-help-and-law/README.md
  neuroscience/README.md
  open-source/README.md
  open-source-sustainability-and-support/README.md
  psychedelics/README.md
  public-services-and-support/README.md
  recipes-cooking-and-food-data/README.md
  research/README.md
  research-funding-and-grants/README.md
  scientific-research/README.md
  security/README.md
  self-hosting-and-homelab/README.md
  spirituality-religion-and-occult/README.md
  tex-and-typesetting/README.md
  travel-and-mobility/README.md
  web-development/README.md
  work-and-learning/README.md
atlas/
  locations.json             ← place hierarchy and geometry registry
  applicability.json         ← explicit resource/place associations and inheritance edges
  places/*.md                ← canonical place-aware resource lists
scripts/
  validate-collection.mjs    ← repository-wide collection validator
  build-site.mjs             ← static portal and Atlas generator
  check-site.mjs             ← generated-site contract checks
site/                        ← dependency-free portal source
  i18n/                     ← locale registry and message catalogs
docs/localization.md         ← locale architecture and review workflow
docs/navigation.md           ← need-first paths, collection guides, and search conventions
docs/resource-metadata.md    ← stable IDs, access constraints, and review provenance
test/                        ← dependency-free parser and schema tests
```

Each list under `lists/` is independently readable and lintable. A large topic may use a nested collection hub when distinct sub-lists make it materially easier to browse.

## What Belongs Here

An awesome resource should be:

- Useful enough to recommend intentionally, not merely related to a category.
- Accessible through a stable, canonical URL.
- Maintained, usable, and documented when those qualities apply.
- Distinct from resources already included in the collection.
- Described clearly enough for readers to understand why it is worth visiting.

Commercial resources are welcome when they provide exceptional value. A resource does not need to be open source or free, but its pricing or access limitations should be clear when relevant.

Resources proposed for `lists/awesome-abundance/` must provide a legitimate no-cost access path. Continuing free tiers, library access, eligibility-based programs, and locally available resources qualify when the relevant constraint is explicit. Temporary trials, piracy, referral funnels, and deceptive "free" offers do not. Shadow libraries are documented only through neutral encyclopedia references in the [Shadow Libraries and Legal Risk](lists/awesome-abundance/books-knowledge-and-archives/README.md#shadow-libraries-and-legal-risk) section, never through direct access links.

## Before Suggesting a Resource

- Search the entire repository for the resource name and URL to avoid duplicates across all sublists.
- Open the URL and confirm that it still works.
- Remove tracking parameters and use the canonical HTTPS URL when available.
- Check that the resource fits the narrowest existing category in the appropriate sublist.
- Be prepared to explain why the resource is awesome.

## Adding a Resource

Use this format:

```markdown
- [Resource Name](https://example.com) - Concise description ending with proper punctuation.
```

New entries should add a stable `id` and appropriate access, authority, scope, and review fields in a trailing `akashic-meta` JSON comment. Atlas cross-posts and volatile or sensitive resources require explicit identity and metadata. Existing entries are migrated incrementally; do not mass-edit the catalog. Follow [Stable resource identity and metadata](docs/resource-metadata.md) for the format, controlled values, and URL-change workflow.

Entries should follow these rules:

- Use the resource's official name and preferred capitalization.
- Link directly to the resource rather than a search result, redirect, or referral URL.
- Start the description with a capital letter and end it with punctuation.
- Keep the description factual, concise, and free of marketing language.
- Mention important access constraints, such as paid-only availability, when useful.
- Place the entry in the narrowest appropriate subsection of the correct sublist.
- Preserve the ordering convention already used by that subsection.

After adding a resource to a sublist:

- Update the `Contents` section in the affected sublist if a new subsection was added.
- Update the resource count for that sublist in its immediate collection hub.
- If the list is nested, update the nested collection's aggregate resource count in the root `README.md`.
- Otherwise, update the resource count for that sublist in the root `README.md`.
- Avoid editing unrelated sublists.

## Suggesting Multiple Resources

Related resources may be proposed together when they form a coherent batch. Keep unrelated suggestions separate so each change remains easy to review, classify, and revise.

## Proposing a Category

Categories should emerge from the collection rather than anticipate it. A new subsection or sublist should:

- Have a clear and distinct scope.
- Contain, or arrive with, enough resources to be useful.
- Avoid unnecessary overlap with existing categories.
- Use a concise title that readers can understand without additional context.

When adding a subsection, update the `Contents` section in the affected sublist.

## Pull Requests

Before submitting a pull request:

- Search the entire repository for duplicate titles and URLs.
- Confirm that every changed link works.
- Confirm that every new entry follows the required format.
- Update the sublist `Contents` when headings change.
- Update the immediate collection hub count and the root aggregate count when a nested list changes.
- Update the root index resource count when a top-level list changes.
- Run `node --test` and `node scripts/validate-collection.mjs` and resolve any findings.
- Run the repository's Awesome Lint wrapper from [`AGENTS.md`](AGENTS.md#collection-changes) for every affected list; it pins `awesome-lint@2.3.0` and disables only rules enforced by the repository-wide validator.
- For list, Atlas, portal, script, JavaScript, CSS, or HTML changes, run `node scripts/build-site.mjs` followed by `node scripts/check-site.mjs`.
- Run `node --check` for each edited JavaScript module.
- Explain what changed and why the proposed resources belong.

Small, focused pull requests are easiest to review, but a cohesive import batch is also welcome.

## Translating the Portal

English is the canonical source language. Russian is the reference locale, and new locales must follow the routing, fallback, placeholder, plural, accessibility, and human-review contract in [Localization architecture](docs/localization.md).

- Translate interface messages through stable keys in `site/i18n/`; do not fork the HTML pages or canonical Markdown catalog.
- Preserve every message key and named placeholder across locale catalogs.
- Use native language names in navigation, not country flags.
- Keep machine-generated translation in draft status until a person reviews it in context.
- Do not translate resource facts or geographic names directly in JavaScript. Future reviewed content overlays will be keyed to stable canonical identifiers.
- Test generated locale routes at narrow and wide widths, including keyboard navigation, both themes, and language changes for assistive technology.

## Publishing Collection Guidance

Important orientation, warnings, decision tables, and starting paths belong in the canonical collection Markdown. A top-level list may expose one coherent region in the portal with `<!-- site-guide:start -->` and `<!-- site-guide:end -->` markers. Do not copy the guide into HTML or JavaScript.

Need-first paths and search aliases must reuse canonical catalog fields instead of maintaining another resource list. Read [Need-first navigation and collection guides](docs/navigation.md) before changing guide markers, `site/needs.js`, search concepts, related paths, or catalog taxonomy controls.

## Removing or Updating a Resource

Resources may be updated or removed when they become unavailable, abandoned, misleading, unsafe, or no longer exceptional. Include the reason for the change so the decision is easy to understand later. A canonical URL change must preserve an explicit resource ID and record the former URL in `aliases` so saved resources and Atlas associations survive. Remember to update every affected count after removing an entry.
