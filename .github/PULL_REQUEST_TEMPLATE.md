## Summary

<!-- Describe what this pull request adds, updates, reorganizes, or removes. -->

## Why It Belongs

<!-- Explain why these resources or structural changes improve the collection. -->

## Affected Surface

<!-- Name the affected lists, Atlas data, site files, scripts, documentation, or workflows. -->

## Checklist

- [ ] I searched the entire repository for duplicate names and URLs across all sublists.
- [ ] I opened each changed link and confirmed it works.
- [ ] New entries use canonical URLs without tracking parameters.
- [ ] New entries include concise descriptions ending with proper punctuation.
- [ ] Resources are placed in the narrowest appropriate subsection of the correct sublist.
- [ ] The `Contents` section of the affected sublist matches its current headings.
- [ ] Every affected resource count is updated in the immediate collection hub and root `README.md` where applicable.
- [ ] `node scripts/validate-collection.mjs` passes locally.
- [ ] The repository's pinned Awesome Lint wrapper passes for every affected resource list.
- [ ] `node --test` and relevant `node --check` syntax checks pass locally.
- [ ] `node scripts/build-site.mjs` and `node scripts/check-site.mjs` pass for list, Atlas, portal, or generator changes.
- [ ] I did not commit generated `dist/` output or temporary `.awesome-lint-input.md` files.
- [ ] Interface changes preserve keyboard focus, both themes, reduced motion, mobile use, and equivalent nonvisual navigation where applicable.
- [ ] I have read and agree to follow the Code of Conduct.
