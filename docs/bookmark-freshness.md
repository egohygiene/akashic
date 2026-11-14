# Freshness evidence in private bookmark batches

Tracking: [#173](https://github.com/egohygiene/akashic/issues/173), parent
[#41](https://github.com/egohygiene/akashic/issues/41). This composes the existing
[offline importer](bookmark-intake.md) with the existing
[freshness reducer](freshness.md). It adds neither an importer nor a scanner.

```sh
node scripts/import-bookmarks.mjs \
  --input .akashic-local/bookmark-intake/input/bookmarks.html \
  --freshness .akashic-local/freshness/reports/reducer.json \
  --as-of 2026-11-13 --freshness-max-age-days 30 \
  --dry-run
```

The explicit version1 reducer wrapper supplies `proposedState`; its retained
review queue is not trusted as a second classification source. Owner validators
check the state and selected exception ledger. Both the state digest and the
wrapper's review-report catalog digest must equal the current resource-index
digest and the bookmark batch digest. Incompatible schema, invalid owner state,
future evidence or digest mismatch fails closed; rerun the reducer/importer
against the same catalog snapshot. The wrapper's exact UTF-8 bytes receive a
SHA-256 reference in every linked observation; the selected validated exception
ledger also has its own digest. Noncanonical timestamp rollovers are rejected.
A digest identifies supplied
evidence; it does not prove who observed it or turn availability into approval.

The importer uses the existing shared canonical URL identity. An observation
matches the candidate's original sanitized URL, never a guessed redirect or
catalog alias destination. All matching resource records are retained. A new URL
or old alias without its own observation stays unknown. Candidate IDs, original
URLs, duplicate classification and source positions remain unchanged.

Each observation retains its response class, status, last successful/observed
time, consecutive failures, redirect destination and GitHub state. Exceptions
retain their identity, scope and active/expired state separately. Human review
dates/cadence remain separate from machine evidence; no approval is inferred.
Neither a single failure nor a long failure streak makes a bookmark dead,
deletion-ready, useful, accurate, safe or publication-eligible.

`--as-of` is an explicit calendar date. Observation age is measured in UTC
calendar days; an age equal to the maximum remains current and greater age is
stale. No implicit wall clock changes a resumed batch. `--freshness-max-age-days`
defaults to30 and may be0–3650. Missing records stay unknown; mixed observed and
missing matches are partial. Coverage reports how many current catalog resources
have state records; it does not infer missing shard success. Existing observations
can independently be stale even when aggregate coverage is complete.

Use `--exceptions` to select another owner-valid ledger; otherwise the current
`maintenance/freshness/exceptions.json` is explicit in the composition. Repeat
the same input, catalog, reducer bytes, ledger, reference date and age limit for
deterministic resume with the existing `--offset`/`--limit` interface. Omit all
freshness options to preserve the original offline report contract.

Without `--dry-run`, an explicit new report path under the ignored
`.akashic-local/bookmark-intake/` directory is required. New directories are
private, symlink parents are rejected and `wx` refuses existing reports. Input
exports, canonical lists and freshness artifacts are never modified. Public CLI
success/failure output contains summaries and safe diagnostics only, not private
candidate titles, URLs, folders, labels or filesystem paths. Synthetic tests
cover actual CLI output, failure redaction and no-overwrite behavior; no real
browser profile or network scan is used.

The remaining parent41 activity is human curation of actual machine-local
batches and any separately approved catalog edits. No private export, human
curation decision, browser import, automatic publication or broader collection
reorganization is claimed by this integration.
