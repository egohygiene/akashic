# Private bookmark intake

Bookmark intake is a local, offline review aid. It never edits a list, publishes a resource, follows a redirect, or treats an HTTP response as evidence that a resource description is accurate.

## Private workspace

Keep any export copied into this repository under `.akashic-local/bookmark-intake/`. That directory, the conventional `bookmark-intake/` directory, and common root-level browser export names are ignored by Git. The importer refuses repository-local input outside the private directory and refuses to write reports anywhere else.

Exports can contain names, account paths, internal hosts, tokens, and personal folder labels. Do not attach them to issues, commit them, or paste full reports into pull requests.

## Supported input

The importer parses these formats without network access:

- Netscape bookmark HTML, including folder paths and `TAGS` labels.
- Chrome-style JSON trees with `roots`, folders, and URL nodes.
- Firefox-style JSON trees with `children`, `uri`, and `tags` fields.

Browser-internal, local-file, executable, unsupported-scheme, credential-bearing, private-network, and likely session/token URLs are rejected before a candidate is emitted. The bounded rejection sample contains only an input position, a reason, and a truncated one-way fingerprint of the raw URL.

## Review flow

Run a summary-only dry run first:

```sh
node scripts/import-bookmarks.mjs \
  --input .akashic-local/bookmark-intake/input/bookmarks.html \
  --dry-run
```

Then create a human-sized local report. Existing reports are never overwritten:

```sh
node scripts/import-bookmarks.mjs \
  --input .akashic-local/bookmark-intake/input/bookmarks.html \
  --limit 50 \
  --output .akashic-local/bookmark-intake/reports/batch-000.json
```

Use `batch.nextOffset` as the next command's `--offset`. Reports retain folder paths and labels because they are local review material. Tracking parameters are stripped, meaningful query parameters are sorted and retained, and URLs are compared against current URLs and aliases from every list plus Atlas place resources.

Candidate classifications are deliberately conservative:

- `duplicate`: the normalized URL is already cataloged or occurred earlier in the same export.
- `redirected`: the normalized URL matches a reviewed former-URL alias.
- `needs-review`: the URL path without its query or normalized title resembles a catalog or Atlas resource.
- `plausible-addition`: no local catalog match was found; this is not an endorsement.

Live redirect and inaccessible classifications require observed freshness evidence and are outside this offline stage. Every candidate still needs human curation, source verification, placement, metadata, and the normal repository validations.
