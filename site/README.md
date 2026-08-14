# Knowledge portal

The portal is a dependency-free static site generated from the repository's Markdown lists. The lists remain the canonical data source; do not edit generated catalog data by hand.

## Local preview

    node scripts/build-site.mjs
    node scripts/check-site.mjs
    python3 -m http.server 8000 --directory dist

Open `http://localhost:8000` in a browser. Changes to any list will appear after running the build command again.

## Deployment

`.github/workflows/pages.yml` builds and deploys the portal after every push to `main`. The deployment is intentionally independent of other lint and validation workflows. GitHub Pages must use **GitHub Actions** as its deployment source in the repository settings.
