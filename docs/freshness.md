# Catalog freshness observations

Akashic separates machine-observable link availability from human review of a resource's description, authority, constraints, and continuing suitability. A successful request never updates `reviewed`, and a failed request never deletes or rewrites a resource.

## Observation boundary

The observation reducer is offline. A scanner supplies a catalog-bound JSON batch; the reducer validates it, derives cumulative state, and creates a bounded human-review queue. The scanner and its network policy are a separate stage.

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
