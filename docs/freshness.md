# Catalog freshness observations

Akashic separates machine-observable link availability from human review of a resource's description, authority, constraints, and continuing suitability. A successful request never updates `reviewed`, and a failed request never deletes or rewrites a resource.

## Observation boundary

The observation reducer is offline. The scanner supplies a catalog-bound JSON batch; the reducer validates it, derives cumulative state, and creates a bounded human-review queue. Neither stage changes canonical lists.

An observation batch uses `schemaVersion: 1`, the SHA-256 digest of the exact repository resource index, one UTC `observedAt` timestamp, and one or more resource observations. Each observation binds the stable resource ID, source path, and current URL and records one to five ordered `HEAD` or `GET` attempts:

```json
{
  "schemaVersion": 1,
  "catalogSha256": "<64 lowercase hexadecimal characters>",
  "observedAt": "2026-09-06T12:00:00Z",
  "observations": [
    {
      "resourceId": "example-service",
      "source": "lists/example/README.md",
      "url": "https://example.org/",
      "attempts": [
        { "method": "HEAD", "outcome": "response", "statusCode": 405, "durationMs": 25 },
        { "method": "GET", "outcome": "response", "statusCode": 200, "durationMs": 80 }
      ],
      "finalUrl": "https://www.example.org/",
      "github": null
    }
  ]
}
```

Allowed non-response outcomes are `connection-error`, `dns-error`, `timeout`, and `tls-error`; their `statusCode` and `finalUrl` are `null`. A `GET` attempt may follow `HEAD`, but `HEAD` cannot resume after the fallback. Redirect destinations must pass the same public-URL safety boundary as bookmark intake. GitHub observations can additionally record the requested `owner/name`, the API's canonical repository name, and archive state.

The reducer derives `success`, `redirected`, `client-error`, `server-error`, `rate-limited`, or `network-error`. It records the last successful and last attempted timestamps, redirect destination, status code, consecutive failures, and GitHub rename/archive state. Rate limiting does not accuse the resource of failure; it preserves the existing failure count.

## Network observation

Plan a shard without making requests or writing a file:

```sh
node scripts/scan-freshness.mjs \
  --shard-index 0 \
  --shard-count 16 \
  --dry-run
```

Observe one shard into the ignored local workspace:

```sh
node scripts/scan-freshness.mjs \
  --shard-index 0 \
  --shard-count 16 \
  --output .akashic-local/freshness/observations/shard-00.json
```

Use `--changed-since <git-ref>` to select only current resources whose Markdown entry was added or changed after that base. Sharding hashes the normalized hostname, so every URL for one domain stays on one shard. Selection and output order are deterministic for a fixed repository tree.

The scanner uses bounded concurrency, waits at least one second between requests to the same hostname, times each attempt out after ten seconds, and retries a transient result once. It starts with `HEAD`; method rejection, server failure, or a network failure triggers a ranged `GET` fallback. A `429` response stops immediately so observation does not amplify rate limiting. Redirects are followed at most five times. Every initial URL and redirect must pass the shared public-URL policy, and each hostname is resolved before every request; a destination is rejected if any returned address is local, private, or otherwise non-public. Response bodies are not persisted, and the ranged fallback is closed after its headers arrive.

GitHub repository URLs receive a separate public API observation for canonical `owner/name` and archive state. `GITHUB_TOKEN` is optional locally. In Actions it is the repository's read-only token, used only for same-origin `api.github.com` requests and never included in artifacts.

[`freshness.yml`](../.github/workflows/freshness.yml) observes changed resource entries on pull requests. A weekly scheduled run and manual dispatch divide the full catalog into 16 hostname-stable shards with at most four shard jobs running simultaneously. Workflows have read-only repository permissions and upload observation bundles as 14-day artifacts; they never commit state or catalog edits. A pull request with no changed resource entries succeeds without creating an empty, invalid observation bundle.

## Local reduction

Start with a summary-only dry run:

```sh
node scripts/reduce-freshness-observations.mjs \
  --observations .akashic-local/freshness/observations/shard-00.json \
  --as-of 2026-09-06 \
  --dry-run
```

Write a new local state-and-review report after inspection:

```sh
node scripts/reduce-freshness-observations.mjs \
  --observations .akashic-local/freshness/observations/shard-00.json \
  --as-of 2026-09-06 \
  --limit 50 \
  --output .akashic-local/freshness/reports/2026-09-06-shard-00.json
```

Reports are never overwritten and can only be written under the ignored `.akashic-local/freshness/` directory. Pass a previous report back with `--state`; the reducer reads its `proposedState`. Use `reviewReport.batch.nextOffset` with `--offset` for the next human-sized queue page.

## Human-review cadence

The review queue starts from the declared `reviewTier` or an annual default, then selects the shortest applicable policy:

| Signal | Maximum interval |
| --- | ---: |
| Crisis or emergency | 31 days |
| Legal, benefits, pricing, free-tier, or high-volatility claims | 92 days |
| Travel | 183 days |
| Default | 365 days |

These intervals schedule human review; an HTTP success cannot satisfy them. Missing `reviewed` metadata remains visible as `human-review-unrecorded` rather than being silently treated as current.

## Exception ledger

[`maintenance/freshness/exceptions.json`](../maintenance/freshness/exceptions.json) is the reviewed exception ledger. Each future entry must bind one current resource ID, source, URL, and one scope: `link-failure`, `redirect`, `github-renamed`, or `github-archived`. It also requires a substantive reason, reviewer GitHub login, review date, and later expiry date.

An active exception suppresses only its matching machine-observation reason. It never suppresses human truth review or marks a resource valid. Expired exceptions restore the original queue reason, and exceptions within 30 days of expiry create their own review item.
