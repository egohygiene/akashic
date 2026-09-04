# Akashic Atlas

Akashic Atlas is the place-aware companion to the main knowledge catalog. It answers a different question: not only “what is useful?” but “what is useful **here**?”

The first coverage paths are:

- `World → United States → California`
- `World → United States → Massachusetts → Wilmington`

This is a foundation, not a claim of comprehensive geographic coverage. The interface and data model are global from the beginning so future country, region, county, city, town, and neighborhood additions do not require a redesign.

## Data model

- [`locations.json`](locations.json) is the root hierarchy manifest. It owns the world root and includes country-scoped location documents under [`locations/`](locations/), where stable place identifiers and map geometry references live.
- [`identifiers/`](identifiers/) contains authoritative country and subdivision code registries and their explicit relationship to the geometry datasets currently available to Atlas.
- [`jurisdictions.json`](jurisdictions.json) contains the versioned legal-jurisdiction records, primary-source provenance, and explicit federalism, district, territorial, and government-to-government relationships used for research routing.
- [`applicability.json`](applicability.json) defines explicit, many-to-many associations between stable main-catalog resource IDs and Atlas places plus the provenance-bearing jurisdiction edges that permit inheritance.
- [`places/`](places/) contains the canonical, human-reviewable Markdown resources for each covered place.
- [`site/data/atlas-themes.json`](../site/data/atlas-themes.json) contains presentation-only map palettes.
- [`scripts/build-site.mjs`](../scripts/build-site.mjs) compiles the hierarchy and place Markdown into `dist/data/atlas.json`.

Do not hand-edit `dist/data/atlas.json`. The location manifest and its included documents, identifier registries, applicability manifest, and place Markdown remain the source of truth.

The legal-jurisdiction registry is intentionally separate from both the place hierarchy and applicability graph. A jurisdiction may reference an authoritative identifier before its corresponding Atlas place is materialized, as the District of Columbia and Puerto Rico do in the initial baseline. Tribal jurisdictions are not attached to state or territorial place records: their relationship with the United States is represented directly and backed by an authoritative source. These records support research routing only. They do not establish controlling law, resource applicability, eligibility, or legal advice, and the build never converts them into inheritance edges.

### Legal jurisdiction model

`jurisdictions.json` uses four explicit collections:

- `sources` records the primary publisher, canonical HTTPS URL, and retrieval date for every classification or relationship claim;
- `jurisdictions` assigns stable IDs and one of the controlled `federal`, `state`, `district`, `territory`, or `tribal` kinds;
- `identifierReference` connects non-tribal records to the existing country or subdivision registries without copying their authoritative codes;
- `relationships` records a reviewed `federalism`, `seat-of-government`, `territorial`, or `government-to-government` relationship between two jurisdictions.

`atlasLocationId` is optional. Its presence means that an independently validated place already exists in the Atlas hierarchy; its absence does not make a jurisdiction unknown or borrow a nearby geometry. Tribal records deliberately cannot declare an Atlas location or subdivision identifier in this schema version. Future place-aware tribal work requires its own reviewed identity and boundary design rather than nesting a Tribal Nation under a state.

Relationship direction names the jurisdiction being researched as the `subjectJurisdictionId` and the federal jurisdiction as the `counterpartJurisdictionId`. These edges are descriptive research context, not a precedence graph. They are never traversed by `deriveAtlasLocationResources`, and adding a legal resource still requires a separate, reviewed association or place-file entry.

The generated location records retain a derived `catalogResources` projection for compatibility with existing schema consumers. The build also emits a precomputed `resourcesByLocation` map so the browser can switch between local and inherited resources without walking the graph at runtime. Both are generated from `applicability.json` and must never be edited or restored to `locations.json` as source data.

## Adding a place

1. Add one location record with a unique `id`, valid `parentId`, and appropriate `kind` to the relevant country document under `atlas/locations/`. Add a sorted include to the root manifest when introducing a country document.
2. Use the authoritative country or subdivision identifiers required below. Extend the relevant identifier registry from a primary source before adding a jurisdiction that it does not cover.
3. Add `atlas/places/<location-id>.md` with an `atlas-location` metadata comment.
4. Prefer official public agencies, public libraries, schools, civic organizations, and locally accountable services.
5. Keep entries specific to the place. General-purpose resources belong in the main `lists/` catalog.
6. When a useful place resource already exists in the main catalog, give the catalog entry an explicit stable ID and metadata, then add an association to `applicability.json` instead of duplicating its description in a place file.
7. Add an inheritance edge only when resources from another jurisdiction should explicitly flow into the new place. Never infer that permission from `parentId` or map containment.
8. Run the normal build and verification commands.

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

- Country records use the ISO 3166-1 alpha-2 stable ID and numeric code recorded in [`identifiers/countries.json`](identifiers/countries.json), sourced from the [ISO Online Browsing Platform](https://www.iso.org/obp/ui/). Their world-map geometry must match that crosswalk and exist in the checked-in topology.
- U.S. subdivision records use the USPS abbreviation and two-digit Census FIPS code published by the [U.S. Census Bureau](https://www.census.gov/library/reference/code-lists/ansi/ansi-codes-for-states.html). [`identifiers/us-subdivisions.json`](identifiers/us-subdivisions.json) records all 50 states, the District of Columbia, five territories, and the U.S. Minor Outlying Islands aggregation.
- Jurisdiction identity and map coverage are separate facts. The checked-in U.S. topology maps the 50 states and District of Columbia; registry entries without a matching boundary declare `geometry: null` instead of borrowing or inventing a shape. Adding one of those jurisdictions to the hierarchy also requires an intentional no-geometry renderer or a reviewed boundary dataset.
- Localities use stable repository-owned slugs, a representative longitude/latitude, and a normalized `mapPosition` within their parent geometry until municipal boundary data is added.

The build validates include paths, stable IDs, hierarchy connectivity, point placement, country codes, subdivision registry matches, every referenced geometry ID, and complete coverage of datasets that a registry claims to map. A mismatch fails before generated data is written.

## Privacy and operating boundaries

- The atlas does not request browser geolocation.
- It has no analytics, map token, external tile service, database, or runtime API dependency.
- Selecting a place only changes local UI state and the page URL.
- Every hierarchy location remains available through native links in the complete place directory. The directory and reviewed resources continue working when a place has no geometry or a checked-in geometry file fails to load.
- Automated discovery should propose reviewed pull requests; it should never silently publish scraped results.
- Link-health automation should verify availability without treating redirects or temporary outages as automatic deletion decisions.

## Map data

The checked-in geometry is a compact build asset, not a live service:

- World countries: `world-atlas@2.0.2`, derived from Natural Earth 1:110m data.
- U.S. states: `us-atlas@3.0.1`, derived from U.S. Census Bureau cartographic boundary files and projected to Albers USA.

Both packages use the ISC license. See [`site/data/geometry/NOTICE.md`](../site/data/geometry/NOTICE.md) for provenance and refresh instructions.

The browser keeps geometry sources in a dataset registry and resolves each map through an exact geometry-dataset and location-level renderer pair. Adding a boundary dataset therefore means declaring its checked-in source, topology object, identifier width, framing, and supported levels rather than adding a country-name branch. If a location has no registered renderer or a geometry asset fails to load, Atlas exposes the native place directory and reviewed resources instead of guessing a boundary or hiding the place.

Atlas location schema 3 deliberately removes the former `camera` object, and country-scoped location documents use schema 2 for the same migration. Those longitude, latitude, and zoom hints never had a runtime consumer and could not frame every projection safely. Map framing now comes only from the checked-in dataset configuration and geometry-derived bounds. Stable place IDs, hierarchy edges, identifiers, geometry references, resource associations, compatibility projections, and existing Atlas URLs remain unchanged.
