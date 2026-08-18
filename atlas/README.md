# Akashic Atlas

Akashic Atlas is the place-aware companion to the main knowledge catalog. It answers a different question: not only “what is useful?” but “what is useful **here**?”

The first intentionally small coverage path is:

`World → United States → Massachusetts → Wilmington`

This is a foundation, not a claim of comprehensive geographic coverage. The interface and data model are global from the beginning so future country, region, county, city, town, and neighborhood additions do not require a redesign.

## Data model

- [`locations.json`](locations.json) defines the geographic hierarchy, stable identifiers, map geometry references, and camera hints.
- [`places/`](places/) contains the canonical, human-reviewable Markdown resources for each covered place.
- [`site/data/atlas-themes.json`](../site/data/atlas-themes.json) contains presentation-only map palettes.
- [`scripts/build-site.mjs`](../scripts/build-site.mjs) compiles the hierarchy and place Markdown into `dist/data/atlas.json`.

Do not hand-edit `dist/data/atlas.json`. The Markdown files remain the source of truth.

## Adding a place

1. Add one location record with a unique `id`, valid `parentId`, and appropriate `kind`.
2. Add `atlas/places/<location-id>.md` with an `atlas-location` metadata comment.
3. Prefer official public agencies, public libraries, schools, civic organizations, and locally accountable services.
4. Keep entries specific to the place. General-purpose resources belong in the main `lists/` catalog.
5. Run the normal build and verification commands.

Each place file uses the same readable entry format as the main awesome lists:

```md
<!-- atlas-location: us-ma-example -->
# Example, Massachusetts

## Government and civic life

- [Example Town](https://example.gov/) - Official municipal information and services.
```

## Identifier conventions

- Countries use ISO 3166-1 numeric geometry identifiers where available.
- U.S. states use two-digit Census FIPS codes.
- Localities use stable repository-owned slugs and a representative point until municipal boundary data is added.

## Privacy and operating boundaries

- The atlas does not request browser geolocation.
- It has no analytics, map token, external tile service, database, or runtime API dependency.
- Selecting a place only changes local UI state and the page URL.
- Automated discovery should propose reviewed pull requests; it should never silently publish scraped results.
- Link-health automation should verify availability without treating redirects or temporary outages as automatic deletion decisions.

## Map data

The checked-in geometry is a compact build asset, not a live service:

- World countries: `world-atlas@2.0.2`, derived from Natural Earth 1:110m data.
- U.S. states: `us-atlas@3.0.1`, derived from U.S. Census Bureau cartographic boundary files and projected to Albers USA.

Both packages use the ISC license. See [`site/data/geometry/NOTICE.md`](../site/data/geometry/NOTICE.md) for provenance and refresh instructions.
