# Public Repository Intelligence source feeds

This checkpoint starts from Akashic main
`62b3f192bde17e74f48b7843c478f308a4ceb2d3`, which merged Journey and attributed
Search in #224. The staged source selector `REVIEWED_INTELLIGENCE_RELAY_SHA`
must be replaced with the final reviewed immutable Relay commit before PR
handoff. Every current generator, producer, provenance helper and consumer
profile must select that same source. This does not select a release tag or
establish consumer qualification.

Refs [Relay #146](https://github.com/egohygiene/relay/issues/146),
[#148](https://github.com/egohygiene/relay/issues/148),
[#149](https://github.com/egohygiene/relay/issues/149),
[#150](https://github.com/egohygiene/relay/issues/150), and
[organization #41](https://github.com/egohygiene/.github/issues/41).

## Current source selection

The existing current build job acquires bounded public issue/PR inventories,
exact-commit check runs and published release metadata on `push` and
`workflow_dispatch`. Relay verifies unauthenticated public repository identity
before and after collection, verifies the selected Git/API source commit, and
packs the existing same-run/head/attempt JSON bundle. The consumer uploads that
ordinary immutable artifact for seven days and passes its exact ID/digest and
actual post-capture `as-of` unchanged into both deterministic generator calls.
The duplicate build replays those same captures rather than querying GitHub
again. A separate thirty-day ordinary artifact retains the bounded producer
receipt; raw captures are never copied into `dist/`.

Those captured paths also enable `collect-dependencies`, admitting Hygiene's
reviewed public roster and declared direct dependency evidence at
`49639c1845cdfd08fbd5a768261a8b3cf515f80f`. The same post-capture evaluation clock
can bind the catalog's real observation. Earlier commit-time PR paths leave
that source off. Declared dependency edges remain owner-authored architectural
context; they do not claim package/runtime adoption, completed gates or another
inventory coverage domain. All nine existing coverage keys retain their owner
semantics.

The build job adds only `actions: read`, `issues: read`, `pull-requests: read`
and `checks: read`. It passes the existing job token only to the bounded public
issue/PR/check reader. Public visibility, release, tag and asset reads remain
unauthenticated, excluding draft releases even when a token exists. Opted-in
titles/check names remain bounded sanitized data. Bodies, comments, actor/app
objects, labels, emails, credentials, signed links and logs are absent.

The read-only reusable review job and PR current builds retain their selected
Journey/Search-only source path. The existing frozen rollback source and
generator have no capture producer, new source flag or new source assertion.
No event, job dependency, status guard, deployment authority, timeout, existing
artifact retention, fixed digest or recovery ordering changes.

## Consumer admission

The current consumer and live profile retain every previous Journey and
attributed Search receipt assertion. Explicit captured builds additionally
require exactly `dependencies,health,journey,releases,work`, the source-plan
digest, matching represented revision and evaluation time on each child source,
native owner validation, the public catalog selection and declared dependency
scope. No-capture builds still require exactly `journey`; they cannot silently
accept a partial new source selection. The current live publication profile
requires the full captured selection, because actual current publication events
are push/manual. The exact frozen recovery profile retains its separate bypass.

Health's producer inventory stays partial, and incomplete/missing/rate-limited
source evidence keeps its actual state. Neither an empty API response nor a
successful capture establishes applicability or healthy checks. Deployments and
install verification remain uncollected. Releases retain resolved public tag
commits and supplied asset digests, without treating `target_commitish` as a
released commit or inventing a digest. Work keeps issues and PRs distinct and
infers no intent relationships, human acceptance or completion from a merge.

Roadmap and ADR collection remain off. Akashic #197 continues to own `AKA-Q03`
ready versus prerequisite `AKA-Q02` active. No canonical roadmap or human
disposition is changed. Compare remains unselected until real compatible pairs
and an explicit retained baseline are separately supplied.

## Review boundary

Static YAML/JavaScript/shell parsing, source/receipt inspection and comparison
of the unchanged publication/rollback gates are this checkpoint's evidence.
Tests, native acquisition/collection/builds, provider/artifact canaries, browser
checks, actual deterministic equality, publication and recovery rehearsal remain
deferred. The twenty-minute double-build budget is unqualified; no gate or
timeout is weakened to make it appear accepted. The starting repository has no
root `CONTINUITY.md`; this focused document records the implementation handoff.
