# akashic knowledge portal

The portal is a dependency-free static site generated from the repository's Markdown lists. The lists remain the canonical data source; do not edit generated catalog data by hand. Collection, nested-list, and section metadata powers the interactive mind map, so every new list, subcollection, or subsection appears there automatically on the next build.

The card browser, hierarchical mind map, catalog filters, search, and saved-resource view share one URL-backed explorer state. Explicit collection and topic choices create browser-history entries, while search typing updates the current entry. Stable collection colors and glyphs are assigned in `scripts/build-site.mjs` and reused throughout the portal.

The browser imports its active matcher through `site/search.js`. The preserved baseline implementation lives in `site/search/and-substring-v1.js`, so the browser and deterministic research runner exercise the same code without allowing later algorithms to rewrite v1. Browser-native semantic-search and optional local-agent research, fixtures, and baseline results live under `research/search/`; after building the site, verify the committed baseline with `node scripts/evaluate-search.mjs --verify research/search/results/and-substring-v1.json`.

`atlas.html` is a separate place-aware explorer. Its hierarchy lives in `atlas/locations.json`, its reviewed resources remain canonical Markdown under `atlas/places/`, and its visual palettes live in `site/data/atlas-themes.json`. The build generates `dist/data/atlas.json`; do not edit that generated file. Compact checked-in TopoJSON keeps the atlas private, static, and independent of paid map services. Use `node scripts/fetch-atlas-geometry.mjs` only when intentionally refreshing the pinned upstream geometry.

## Local preview

    node scripts/build-site.mjs
    node scripts/check-site.mjs
    python3 -m http.server 8000 --directory dist

Open `http://localhost:8000` in a browser. Changes to any list or atlas place will appear after running the build command again.

## Deployment

`.github/workflows/pages.yml` builds and deploys the portal after every push to `main`. The deployment is intentionally independent of other lint and validation workflows. GitHub Pages must use **GitHub Actions** as its deployment source in the repository settings.

The production portal is published at `https://akashic.egohygiene.io/`.
