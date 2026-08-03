# Contribution Guidelines

Thank you for helping this collection become more useful. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## What Belongs Here

An awesome resource should be:

- Useful enough to recommend intentionally, not merely related to a category.
- Accessible through a stable, canonical URL.
- Maintained, usable, and documented when those qualities apply.
- Distinct from resources already included in the collection.
- Described clearly enough for readers to understand why it is worth visiting.

Commercial resources are welcome when they provide exceptional value. A resource does not need to be open source or free, but its pricing or access limitations should be clear when relevant.

## Before Suggesting a Resource

- Search the repository for the resource name and URL.
- Open the URL and confirm that it still works.
- Remove tracking parameters and use the canonical HTTPS URL when available.
- Check that the resource fits the narrowest existing category.
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
- Place the entry in the narrowest appropriate category.
- Preserve the ordering convention already used by that category.

## Suggesting Multiple Resources

Related resources may be proposed together when they form a coherent batch. Keep unrelated suggestions separate so each change remains easy to review, classify, and revise.

## Proposing a Category

Categories should emerge from the collection rather than anticipate it. A new category should:

- Have a clear and distinct scope.
- Contain, or arrive with, enough resources to be useful.
- Avoid unnecessary overlap with existing categories.
- Use a concise title that readers can understand without additional context.

When adding a category, update the `Contents` section in `README.md` and keep its nesting shallow.

## Pull Requests

Before submitting a pull request:

- Confirm that every changed link works.
- Confirm that every new entry follows the required format.
- Update `Contents` when headings change.
- Run `npx --yes awesome-lint` and resolve applicable findings.
- Explain what changed and why the proposed resources belong.

Small, focused pull requests are easiest to review, but a cohesive import batch is also welcome.

## Removing or Updating a Resource

Resources may be updated or removed when they become unavailable, abandoned, misleading, unsafe, or no longer exceptional. Include the reason for the change so the decision is easy to understand later.
