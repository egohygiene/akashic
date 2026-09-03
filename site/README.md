# akashic knowledge portal

The portal is a dependency-free static site generated from the repository's Markdown lists. The lists remain the canonical data source; do not edit generated catalog data by hand. Collection, nested-list, and section metadata powers the interactive mind map, so every new list, subcollection, or subsection appears there automatically on the next build.

The card browser, compact catalog layout, hierarchical mind map, catalog filters, exact-domain paths, and saved-resource view share URL-backed explorer state. Natural-language search is deliberately ephemeral: typing and submitting keep the question in memory without writing it to the address bar, browser history, or storage. An explicit **Copy search link** action places the query in the URL fragment, which browsers do not send with the HTTP request; the receiving page consumes that fragment and immediately restores the ordinary `#catalog` anchor. Legacy `?q=` links remain readable for compatibility and are sanitized after load. Explicit collection, topic, domain, and layout choices still create browser-history entries. Stable collection colors and glyphs are declared in `scripts/lib/catalog.mjs` and reused throughout the portal; a top-level collection without an explicit identity fails the build.

Creative Tools entries may begin their description with a bold access block such as `**Open · Desktop.**`. The shared parser extracts that block into `accessLabels` for readable card chips while preserving the one-line Markdown entry as the canonical source. The generated JSON intentionally omits wall-clock build timestamps so identical canonical inputs produce byte-identical portal artifacts.

`dashboard.html` is the Akashic Observatory: a lightweight overview lens for resource distribution, collection depth, topic paths, and source domains. The build derives `dist/data/overview.json` from the same canonical Markdown as the full catalog, so the dashboard does not download the much larger resource payload or maintain a second source of truth. Every chart has an equivalent linked text path into the main catalog. The separate Relay-generated `/intelligence/` surface remains the source-file, activity, and repository-health lens.

The repository-local `.github/FUNDING.yml` is the canonical funding configuration. During the build, active entries become `dist/data/funding.json` and locally styled footer links on the Portal, Observatory, and Atlas. No remote badge images, scripts, or trackers are used.

English is the canonical and default portal language. The build also publishes a complete Russian reference interface under `/ru/` from stable-key catalogs in `site/i18n/`; it reuses the root scripts, styles, generated JSON, and geometry instead of duplicating the catalog. Locale-aware modules load messages relative to their own module URL, format numbers and plurals through browser-native `Intl` APIs, preserve explicit language choices and URL state, and fall back to English. Canonical resource and Atlas content remains English and is marked as such on Russian pages. See [`docs/localization.md`](../docs/localization.md) for the extension and review contract.

The browser imports its active matcher through `site/search.js`. The preserved baseline implementation lives in `site/search/and-substring-v1.js`, so the browser and deterministic research runner exercise the same code without allowing later algorithms to rewrite v1. Browser-native semantic-search and optional local-agent research, fixtures, and baseline results live under `research/search/`; after building the site, verify the historical baseline with `node scripts/evaluate-search.mjs --fixture research/search/evaluations/natural-language-v1.json --verify research/search/results/and-substring-v1.json`.

`search-lab.html` is an explicit, dependency-free browser measurement surface for the active search kernel. The build materializes the canonical v2 evaluation extension at `dist/data/search-evaluation-v2.json`; the lab does not accept typed search text or maintain a second fixture. A run measures same-origin catalog reload and repeat-request behavior, JSON parsing, index construction, every fixture query, and feature-detected long-task and memory signals. Reports stay in memory until the visitor explicitly downloads JSON, and environment-specific results must keep their device, browser, viewport, network, and configuration context.

`atlas.html` is a separate place-aware explorer. Its root hierarchy manifest lives in `atlas/locations.json`, country-scoped place records live under `atlas/locations/`, authoritative jurisdiction codes and reviewed geometry mappings live under `atlas/identifiers/`, explicit main-catalog resource/place associations and inheritance edges live in `atlas/applicability.json`, resources canonical to one place remain Markdown under `atlas/places/`, and visual palettes live in `site/data/atlas-themes.json`. The build validates those sources against the checked-in geometry and precomputes local-to-broader resource paths in `dist/data/atlas.json`; the browser never infers identity or applicability from map containment. Do not edit that generated file. Compact checked-in TopoJSON keeps the atlas private, static, and independent of paid map services. Use `node scripts/fetch-atlas-geometry.mjs` only when intentionally refreshing the pinned upstream geometry.

## Local preview

    node scripts/build-site.mjs
    node scripts/check-site.mjs
    python3 -m http.server 8000 --directory dist

Open `http://localhost:8000` for English, `http://localhost:8000/ru/` for Russian, or `http://localhost:8000/search-lab.html` for the Search Lab. Changes to any list, Atlas place, search evaluation, or locale catalog will appear after running the build command again.

## Deployment

`.github/workflows/pages.yml` builds and deploys the portal after every push to `main`. The deployment is intentionally independent of other lint and validation workflows. GitHub Pages must use **GitHub Actions** as its deployment source in the repository settings.

The workflow composes the portal and Relay-generated repository intelligence into one Pages artifact. Akashic pins the Relay action to its reviewed v1.3 commit and relies on Relay's canonical directory, exclusion, history, and depth defaults rather than duplicating them in the consumer workflow. The ordinary local portal check remains independent of that CI-only surface; `node scripts/check-intelligence.mjs` verifies the expected Relay subtree entries, immutable generator provenance, represented Akashic commit, and `public-safe` publication classification when validating a complete composed artifact.

The production portal is published at `https://akashic.egohygiene.io/`, with repository intelligence at `https://akashic.egohygiene.io/intelligence/`.
