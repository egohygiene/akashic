# Atlas geometry provenance

The Akashic Atlas ships compact TopoJSON so the map works without a paid tile provider, API token, user tracking, or runtime network request.

| File | Source | Upstream data | License | SHA-256 |
| --- | --- | --- | --- | --- |
| `countries-110m.json` | `world-atlas@2.0.2` | Natural Earth 1:110m countries | ISC | `2516c915867c7baf18ddec727aec46c315541a07cfb3d79a6559b05d5e94eee8` |
| `states-albers-10m.json` | `us-atlas@3.0.1` | U.S. Census Bureau cartographic boundary files | ISC | `6e7bb086a3c791490361968a3094f377f7726c5d0c4900fec03cc42db2305a3d` |

The package maintainers simplify, quantize, stitch, and project the original public geographic data. These boundaries are for navigation and orientation, not surveying, legal boundaries, emergency response, or navigation.

To refresh the pinned assets, update the versions and expected hashes in `scripts/fetch-atlas-geometry.mjs`, run that script explicitly, then rebuild and review the visual diff. The normal site build is intentionally offline and deterministic.
