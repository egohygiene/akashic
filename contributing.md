# Contribution Guidelines

Thank you for helping this collection become more useful. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Repository Structure

This repository is organized as a collection of focused Awesome lists:

```
README.md                    ← collection hub and index
contributing.md              ← these guidelines
lists/
  artificial-intelligence/README.md
  awesome-abundance/
    README.md               ← nested collection hub
    */README.md             ← focused no-cost resource lists
  containers-and-cloud/README.md
  creative-resources/README.md
  developer-tools/README.md
  health-and-well-being/README.md
  neuroscience/README.md
  open-source/README.md
  psychedelics/README.md
  public-services-and-support/README.md
  research/README.md
  research-funding-and-grants/README.md
  scientific-research/README.md
  security/README.md
  self-hosting-and-homelab/README.md
  tex-and-typesetting/README.md
  web-development/README.md
  work-and-learning/README.md
scripts/
  validate-collection.mjs    ← repository-wide collection validator
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
- Run `node scripts/validate-collection.mjs` and resolve any findings.
- Run `npx --yes awesome-lint` from the affected sublist directory and resolve applicable findings.
- Explain what changed and why the proposed resources belong.

Small, focused pull requests are easiest to review, but a cohesive import batch is also welcome.

## Removing or Updating a Resource

Resources may be updated or removed when they become unavailable, abandoned, misleading, unsafe, or no longer exceptional. Include the reason for the change so the decision is easy to understand later. Remember to update every affected count after removing an entry.
