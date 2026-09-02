# Akashic instructions for Copilot and coding agents

Markdown under `lists/` is the canonical resource catalog. Follow `AGENTS.md`, `contributing.md`, and `docs/resource-metadata.md`; do not create a second catalog.

For every new resource:

- Use the normal one-line Awesome entry and append an `akashic-meta` JSON comment on the same line.
- Include a globally unique, explicit, lowercase stable `id`. Search all list files and generated catalog data before choosing it.
- Add applicable controlled metadata for resource type, role, authority, access, geography, language, platform, account, license, status, volatility, review cadence, and sensitive scope.
- Never change an existing ID when its title or URL changes. Put former HTTP(S) URLs in `aliases` so saved resources continue to resolve.
- Keep human truth review (`reviewed`) separate from automated link availability (`linkStatus` plus `linkChecked`).
- Reference main-catalog resources from Atlas by `resourceId`, never by URL.
- Do not mass-backfill untouched legacy entries.

Before finishing any resource, Atlas, schema, or portal change, run:

```sh
node scripts/validate-collection.mjs
node --test
node scripts/build-site.mjs
node scripts/check-site.mjs
```

Also run the pinned `awesome-lint@2.3.0` wrapper documented in `AGENTS.md` for every affected resource list, plus `node --check` for edited JavaScript. Do not propose a pull request until these checks pass, temporary lint inputs are removed, and `git diff --check` is clean.
