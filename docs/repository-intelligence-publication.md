# Repository Intelligence publication

Akashic owns the composition and deployment of its GitHub Pages site. Relay is an immutable, read-only artifact builder and provenance verifier; it never receives Pages or OpenID Connect write authority and never deploys Akashic.

## Publication contract

`.github/workflows/pages.yml` is the sole deployment workflow. It keeps the existing portal build, captures a byte-level baseline of consumer-owned files and routes, composes Relay's generated `/intelligence/` subtree, verifies that the baseline survived unchanged, and uploads the final `dist/` tree as the Pages artifact.

Akashic has file/directory prefix siblings such as `i18n.js` with `i18n/` and `search-lab.js` with `search/`. After Relay captures the baseline, the consumer workflow canonically sorts only the baseline's file records by their public relative paths. This semantics-preserving compatibility step satisfies Relay v1.6's closed verifier ordering without changing captured bytes, digests, routes, or deployed content.

The current workflow selects the reviewed immutable Relay source
`981ddf4367c67fcd625e54321d95bab027f6c0f2`. This continuation starts from Akashic main
`62b3f192bde17e74f48b7843c478f308a4ceb2d3`, which merged Journey/Search in
[Akashic #224](https://github.com/egohygiene/akashic/pull/224). The
[public-source handoff](repository-intelligence-sources.md) adds bounded
Work/Health/Releases captures and declared Dependencies on current push/manual
builds. Read-only review, controlled failure, current composition and provenance
verification retain that same selected Relay source; frozen recovery keeps its
separate v1.3 pin. This is an implementation candidate without deployment or
acceptance proof.

Pull requests run with read-only repository and Pages access. They build and validate the complete composed site and retain `akashic-composed-site-<revision>-<attempt>` plus `akashic-composition-evidence-<revision>-<attempt>` for 30 days. The deploy and live-verification jobs are structurally excluded from pull requests, including untrusted forks.

Pushes to `main` and manual `current` rebuilds use Akashic's existing `actions/deploy-pages` job. That privileged job contains only the pinned official deployment action and holds only `pages: write` and `id-token: write`. A subsequent job with read-only contents and Actions permissions downloads the exact provenance handoff produced in the same workflow run, records the separate receipt against the Pages action's reported public URL when available, and reasserts both results. Relay therefore never executes with Pages or OpenID Connect write authority.

## Evidence boundary

The deterministic bundle contains `dist/intelligence/build-manifest.json`. It binds the represented Akashic revision, immutable Relay revision and version, input/schema contracts, source epoch, enabled routes, payload file inventory, and bundle digest. Building the same declared inputs twice must reproduce the exact manifest and bundle digest.

Deployment-specific state is deliberately outside `dist/`:

- `.relay/repository-intelligence-deployment/consumer-route-baseline.json` inventories unrelated consumer-owned files and routes before composition.
- `.relay/repository-intelligence-deployment/composition-verification.json` binds the build manifest to the final composed-site digest and proves preserved consumer routes.
- `.relay/repository-intelligence-deployment/deployment-receipt.json` binds that verification to the workflow run and attempt, Pages environment, canonical public URL, deployment conclusion, published route inventory, local aliases, and rollback point.
- `.akashic-local/repository-intelligence/live-verification.json` records the canonical route responses and the redirect-only GitHub Pages fallback aliases after deployment.

These retained files contain only public repository identifiers, immutable revisions, tagged digests, route paths, run identifiers, timestamps, and public URLs. Tokens, headers, environment dumps, private payloads, commit messages, contributor identities, and runner filesystem roots are not included.

## Required routes and live origins

The composed site must retain `/` and all generated Repository Intelligence routes:

- `/intelligence/`
- `/intelligence/audits/`
- `/intelligence/compare/`
- `/intelligence/dashboard/`
- `/intelligence/decisions/`
- `/intelligence/dependencies/`
- `/intelligence/diagnostics/`
- `/intelligence/distribution/`
- `/intelligence/health/`
- `/intelligence/hygiene/`
- `/intelligence/identity/`
- `/intelligence/journey/`
- `/intelligence/now/`
- `/intelligence/releases/`
- `/intelligence/roadmap/`
- `/intelligence/sanity/`
- `/intelligence/search/`
- `/intelligence/work/`

The canonical origin is `https://akashic.egohygiene.io/`. `https://egohygiene.github.io/akashic/` is a redirect-only fallback alias: every required route must redirect to its exact canonical counterpart rather than serving an independent mutable copy.

The current bundle includes Relay's repository-profile `routes.json`, shared branding assets and graph enhancement. The six additional routes expose their explicit unsupported source boundaries; their presence does not establish conformance, ratification, audit completion, Identity adoption or channel delivery. `/intelligence/identity/` is the Intelligence evidence view; Relay does not take ownership of a consumer `/identity/` product. Declared aliases in the route manifest are metadata and do not create new redirects or overwrite Akashic routes.

`scripts/lib/intelligence-publication-profile.mjs` binds the current 18-route inventory and current artifact entries to this exact Relay revision. The live verifier requires `--expected-relay-revision`: the current pin selects the registered repository profile, while only Relay `55587de4ff322931d401e964f5af0716633dd675` paired with Akashic `cfa0cb3a948cf57eac9503604c5d19fa42178b2b` selects the frozen 12-route recovery profile. Served provenance must identify that exact generator, source and version. Current publication also verifies the served build manifest and route registry binding. A current generator cannot satisfy the historical profile merely because its routes return HTTP 200. The live report records bounded evidence hashes and the manifest's declared bundle digest; the existing build-time checks remain responsible for complete payload inventory verification.

## Current adoption checkpoint

This change advances the shared publisher and its matching local admission metadata. It preserves the portal build, canonical and fallback origins, sole deployer, job conditions, deterministic double build, baseline sorting, existing evidence retention and frozen recovery inputs. The current build additionally has only the read permissions required for bounded source capture and exact artifact intake. It overlaps the older independent pin bumps in [Akashic #220](https://github.com/egohygiene/akashic/pull/220) and [#221](https://github.com/egohygiene/akashic/pull/221); those proposed `b4a88db` pins should be reconciled during review rather than merged over this newer candidate.

All current generators retain `collect-journey: true` and
`search-attribution: true`. On actual current push/manual paths, the source
producer supplies one exact same-run capture artifact and actual `as-of` to both
generator calls; those paths also enable `collect-dependencies`. No-capture PR
and read-only review paths retain their original Journey/Search-only selection.
The same immutable Relay revision appears in every current builder/provenance
call and `CURRENT_RELAY_REVISION`. Generic Git titles remain the default;
bounded ancestry can be partial, and semantic history always is. Commit bodies,
subjects, identities, paths and unresolved trailers do not become public graph
or Search facts. Search attribution remains supplied by Observatory owner fields.
The source producer's explicitly selected public issue/PR/release titles and
check names use its separate bounded sanitization.

The current consumer check and current live profile require matching Journey
and Search normalization receipts in public provenance. Captured build/live
profiles additionally require exactly the five selected source receipts with
matching source/evaluation bindings; no-capture paths still require Journey
alone. Original domain
collector pins stay independent of the newer final Search normalization profile.
The registered 18 routes and 30 top-level artifact entries remain unchanged;
there is no additional Search asset. The exact frozen recovery profile bypasses
these new adoption requirements and keeps its original generator and bytes.

Roadmap, ADR, external snapshots and comparison inputs remain unselected.
Deployments and install verification remain explicitly uncollected. Work,
commit-matched Health and published Releases use the real bounded captures on
current push/manual paths, with declared dependency scope kept separate. [Akashic #197](https://github.com/egohygiene/akashic/issues/197)
still owns `AKA-Q03` ready versus prerequisite `AKA-Q02` active. This upgrade
does not rewrite those declarations or establish roadmap acceptance. Retained
Compare artifacts remain a later opt-in requiring two real compatible captures
and an explicit baseline lease; this change supplies neither a baseline nor a
synthetic comparison selection.

Validation for this adoption pass is limited to source review, JavaScript syntax and diff inspection. Tests, builds, CI, browser checks, hosted artifact review, current deployment and recovery rehearsal are deferred. Existing publication records remain historical evidence for their exact revisions.

Native Git trailer admission, the new normalization runtime, and the existing
20-minute double-build budget remain unqualified until the deferred execution
pass. A real native finding must fail the current build; this candidate does not
weaken source validation or human authority to populate the pages. Existing main
pushes may publish through the unchanged Akashic-owned Pages path if its gates
succeed; a pin commit is not evidence that they did.

The deferred test pass must update the existing workflow pin constants and live-verifier fixtures for the mandatory expected Relay argument, exact current/recovery profile denials, and bounded provenance/manifest/routes responses. Existing fixtures still describe the previous publisher and HTTP-only verifier; no suite result is claimed for this candidate.

## Manual verification and controlled failure

Run **Deploy akashic** with `mode=current` to rebuild the represented default-branch revision and exercise the normal deployment and receipt path.

Run **Retain Repository Intelligence failure evidence** to supply the intentionally invalid Relay input `max-depth=21`. This dispatch-only workflow has read-only contents permission, a concurrency lane separate from Pages, and no build, Pages, OpenID Connect, secret, or deployment path. The reusable job must fail with `RIW-002`, upload no site, and retain its sanitized 30-day failure report. This red run is expected evidence, not a publication regression.

After any successful deployment, download and inspect these 30-day artifacts from the same run:

1. `repository-intelligence-*` for Relay's read-only workflow evidence.
2. `akashic-composed-site-*` for the reviewable final tree.
3. `akashic-composition-evidence-*` for the consumer baseline and non-clobber verification.
4. `akashic-deployment-receipt-*` for the separate deployment receipt.
5. `akashic-live-verification-*` for canonical and fallback observations.

## Recovery and rollback

The fixed rollback point is:

- Akashic revision: `cfa0cb3a948cf57eac9503604c5d19fa42178b2b`
- Relay v1.3 revision: `55587de4ff322931d401e964f5af0716633dd675`
- last known-good Pages run: `35400101977`
- composed-site digest: `sha256:969a3f82abf532ed936c2600fc73045f4df1775185d441168f74724754bcba28`

Relay v1.3 embeds the checkout directory basename in the repository tree payload. Reproduce this point in a directory named `akashic`; the workflow rejects other names. The digest is SHA-256 of newline-terminated compact JSON file records (`bytes`, relative `path`, tagged `sha256`) ordered by Python `Path` components, including `.nojekyll`. This path-component ordering must not be replaced with relative-path string sorting. The original configured digest failed the live rollback gate in run `35812301720`; it was not evidence of a successful rollback.

Pull requests build both `current` and this fixed rollback point in a read-only matrix. Both retain review artifacts; neither configures Pages, uploads a Pages artifact, or deploys. Rollback verification retains a public file inventory and an allowlisted report with expected/actual digests, conclusion, immutable revisions, and run identity for 30 days, including on digest mismatch. A mismatch still fails the build before any Pages upload or deployment. A successful PR proof does not replace the post-merge deployment rehearsal.

To recover, manually run **Deploy akashic** with `mode=rollback-v1.3`. This mode deliberately skips the current Relay review job, so a defect in the current generator cannot block recovery. The workflow checks out the fixed Akashic revision, rebuilds with the fixed Relay v1.3 pin, verifies the exact composed-site digest, retains `akashic-rollback-evidence-*`, and deploys through the same Akashic-owned Pages job. It does not move a branch, rewrite history, change DNS, or grant Relay deployment authority. After service is restored, diagnose the current path and publish a normal forward fix through a reviewed pull request.

Rollback intentionally skips the current Relay review job. GitHub propagates skipped prerequisites through the job dependency chain unless a condition includes an explicit status function. Deployment and live verification therefore use `!cancelled()` plus explicit successful prerequisite results. A failed, skipped, or cancelled build cannot deploy; failed deployment or receipt finalization cannot pass live verification. Receipt finalization keeps its existing `always()` guard to retain failure evidence.

The read-only `repository-intelligence-gates.yml` PR fixture exercises the actual GitHub scheduler with a skipped review ancestor, successful build, and simulated deployment/finalization/live jobs. It substitutes only a fixed test event in the production conditions, checks those conditions for drift, asserts that a PR-denial job stays skipped, and retains a bounded 30-day result report. It has no Pages actions, environment, secrets, or write permissions. This catches the skipped deployment observed in run `35843659061`, which passed the rollback build and uploaded a Pages artifact but never deployed it.

## Lifecycle evidence

Implementation is tracked in [Akashic #185](https://github.com/egohygiene/akashic/issues/185) under [Relay #33](https://github.com/egohygiene/relay/issues/33). Pull-request, exact-head Actions, deployment, manual-rebuild, retained failure, live-route, and rollback-run links are recorded on #185 as they become available. Default-branch, manual, controlled-failure, and live deployment evidence necessarily follow merge because GitHub runs the checked-in workflow from the default branch.
