# Akashic Atlas

Akashic Atlas is the place-aware companion to the main knowledge catalog. It answers a different question: not only “what is useful?” but “what is useful **here**?”

The first coverage paths are:

- `World → United States → California`
- `World → United States → Massachusetts → Wilmington`

This is a foundation, not a claim of comprehensive geographic coverage. The interface and data model are global from the beginning so future country, region, county, city, town, and neighborhood additions do not require a redesign.

## Data model

- [`locations.json`](locations.json) defines only the geographic hierarchy, stable place identifiers, map geometry references, and camera hints.
- [`applicability.json`](applicability.json) defines explicit, many-to-many associations between stable main-catalog resource IDs and Atlas places plus the provenance-bearing jurisdiction edges that permit inheritance.
- [`places/`](places/) contains the canonical, human-reviewable Markdown resources for each covered place.
- [`site/data/atlas-themes.json`](../site/data/atlas-themes.json) contains presentation-only map palettes.
- [`scripts/build-site.mjs`](../scripts/build-site.mjs) compiles the hierarchy and place Markdown into `dist/data/atlas.json`.

Do not hand-edit `dist/data/atlas.json`. The location registry, applicability manifest, and place Markdown remain the source of truth.

The generated location records retain a derived `catalogResources` projection for compatibility with existing schema consumers. The build also emits a precomputed `resourcesByLocation` map so the browser can switch between local and inherited resources without walking the graph at runtime. Both are generated from `applicability.json` and must never be edited or restored to `locations.json` as source data.

## Adding a place

1. Add one location record with a unique `id`, valid `parentId`, and appropriate `kind`.
2. Add `atlas/places/<location-id>.md` with an `atlas-location` metadata comment.
3. Prefer official public agencies, public libraries, schools, civic organizations, and locally accountable services.
4. Keep entries specific to the place. General-purpose resources belong in the main `lists/` catalog.
5. When a useful place resource already exists in the main catalog, give the catalog entry an explicit stable ID and metadata, then add an association to `applicability.json` instead of duplicating its description in a place file.
6. Add an inheritance edge only when resources from another jurisdiction should explicitly flow into the new place. Never infer that permission from `parentId` or map containment.
7. Run the normal build and verification commands.

Each place file uses the same readable entry format as the main awesome lists:

```md
<!-- atlas-location: us-ma-example -->
# Example, Massachusetts

## Government and civic life

- [Example Town](https://example.gov/) - Official municipal information and services.
```

### Directory and navigator links

Atlas is a doorway into local knowledge, not a mirror of every changing listing on the internet. Prefer a trusted directory, locator, or service navigator when it already maintains the deeper inventory. Mark that role at the end of the entry so the portal can feature it clearly:

```md
- [Example Service Finder](https://example.gov/find/) - Search maintained local services by place and need. <!-- atlas-role: index -->
```

Catalog associations in `applicability.json` may use `"role": "index"` for the same purpose. Use the role only for resources that actually help people discover multiple downstream services, organizations, places, or records.

```json
{
  "resourceId": "example-service-finder",
  "locationId": "us-ma-example",
  "relationship": "specific",
  "section": "Start here: local finders",
  "role": "index",
  "provenanceId": "example-scope-review"
}
```

Atlas catalog associations never use canonical URLs as identity. The referenced main-catalog entry must have an explicit `akashic-meta` ID; URL changes then preserve every association. A resource may be associated with more than one place, while a duplicate resource/place pair fails validation.

`relationship` is authored as one of:

- `specific` when the resource itself applies to the named place;
- `cross-associated` when a curator intentionally exposes a resource at another place without claiming that it is specific to that place.

`inherited` is deliberately not an authored association value. The build derives it from an explicit inheritance edge while retaining the source location, source relationship, and full inheritance path. Each path contains stable references to the top-level edge registry, where the provenance that caused the inclusion remains materialized once instead of being duplicated into every placement. Only `specific` resources flow across an inheritance edge; a `cross-associated` resource remains confined to the place where a curator intentionally exposed it.

Inheritance is a separate directed graph because geographic containment is not proof of legal or service applicability. Each edge requires known stable location IDs and provenance, duplicate edges and cycles fail validation, and multiple reviewed parents remain possible for future territorial, tribal, or overlapping jurisdictions:

```json
{
  "locationId": "us-ma-example",
  "inheritsFromLocationId": "us-ma",
  "provenanceId": "example-scope-review"
}
```

The manifest order resolves equal-depth parents deterministically. The generated resource order is always direct resources first, then the nearest inherited jurisdiction, then broader jurisdictions. Stable resource IDs are deduplicated with the closest explicit association winning. The Atlas interface exposes that distinction through scope and provenance labels plus a URL-backed **Local only / All available here** control.

The initial United States, California, Massachusetts, and Wilmington edges retain migration provenance from the former hierarchy. That records how the relationship entered the repository without claiming a new human truth review; future jurisdiction work can replace it with human-review provenance supported by an authoritative scope source.

Every association points to a reusable provenance record. Existing references were moved with migration provenance, which records their source but does not claim a new human truth review. New applicability claims should use human-review provenance with an HTTPS evidence source, review date, and GitHub reviewer:

```json
{
  "id": "example-scope-review",
  "kind": "human-review",
  "sourceUrl": "https://example.gov/service-area",
  "reviewed": "2026-09-03",
  "reviewedBy": "github-handle"
}
```

Resources in `places/*.md` remain implicitly `specific` to that file's `atlas-location`. They must not duplicate a main-catalog URL. Promote a resource to the main catalog with an explicit ID before associating the same canonical resource with multiple places. See [Stable resource identity and metadata](../docs/resource-metadata.md).

## Identifier conventions

- Countries use ISO 3166-1 numeric geometry identifiers where available.
- U.S. states use two-digit Census FIPS codes.
- Localities use stable repository-owned slugs, a representative longitude/latitude, and a normalized `mapPosition` within their parent geometry until municipal boundary data is added.

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
