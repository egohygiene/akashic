# Agent Guide for akashic

This file is the canonical operating contract for automated contributors working in this repository. It applies to the entire repository unless a more specific `AGENTS.md` exists in a descendant directory.

## Mission

akashic is Ego Hygiene's living constellation of curated knowledge. The repository has two inseparable products:

1. Focused, independently readable Awesome lists stored as Markdown under `lists/`.
2. A dependency-free static knowledge portal generated from those lists and published through GitHub Pages.

Protect both products. A change is incomplete when the Markdown is correct but the generated portal contract is broken, or when the portal looks correct but the canonical lists are inaccurate.

## Sources of Truth

- Markdown files under `lists/` are the canonical resource data.
- The root `README.md` is the canonical top-level collection index and declared-count ledger.
- A nested collection hub, currently `lists/awesome-abundance/README.md`, is the canonical index and count ledger for its child lists.
- Files under `site/` are the canonical portal source.
- `site/i18n/locales.json` and `site/i18n/*.json` are the canonical locale registry and interface message catalogs.
- `atlas/locations.json`, `atlas/locations/*.json`, `atlas/identifiers/*.json`, `atlas/jurisdictions.json`, `atlas/applicability.json`, and `atlas/places/*.md` are the canonical Atlas hierarchy manifest, country location sources, identifiers, legal-jurisdiction model, main-catalog associations, and place resources.
- Files under `scripts/` define collection validation and portal generation.
- Files under `dist/` are generated output. Never hand-edit them, and do not include regenerated output in a change unless explicitly requested.
- `contributing.md` defines the public contribution policy. Keep agent behavior consistent with it.

When documentation and executable validation disagree, investigate the discrepancy instead of silently weakening either one.

## Repository Map

```text
README.md                         Top-level collection index and resource counts
contributing.md                   Public curation and contribution rules
lists/
  <collection>/README.md          Standalone Awesome lists
  awesome-abundance/
    README.md                     Nested collection hub
    <subcollection>/README.md     Focused Awesome Abundance lists
atlas/
  locations.json                  Root place manifest and world location
  locations/*.json                Country-scoped hierarchy and geometry records
  identifiers/*.json              Authoritative jurisdiction codes and geometry mappings
  jurisdictions.json              Explicit legal-jurisdiction records and relationships
  applicability.json              Explicit catalog resource/place associations
  places/*.md                     Resources canonical to one place
scripts/
  lib/                            Shared catalog and Atlas parsing/validation modules
  validate-collection.mjs         Repository-wide structural and duplicate checks
  build-site.mjs                  Markdown-to-static-catalog generator
  check-site.mjs                  Generated portal contract checks
site/
  index.html                      Portal document structure
  styles.css                      Visual system and responsive behavior
  app.js                          Catalog, filtering, search, favorites, and URL state
  mind-map.js                     Interactive collection and topic map
  i18n.js                         Browser locale, fallback, number, and plural runtime
  i18n/                           Locale registry and stable-key message catalogs
  assets/                         Portal-owned static assets
docs/localization.md              Locale architecture and human-review contract
docs/navigation.md                Need-first paths, Markdown guide, and search contracts
test/                             Dependency-free parser and Atlas schema tests
dist/                             Generated local build output
.github/workflows/
  awesome-lint.yml                Collection validation and Awesome Lint
  quality.yml                     Full PR syntax, test, lint, build, and site gate
  pages.yml                       Independent GitHub Pages build and deployment
```

Atlas source data is split deliberately: `atlas/locations.json` is the root manifest, `atlas/locations/*.json` contains country-scoped places, `atlas/identifiers/*.json` separates authoritative jurisdiction identity from available map geometry, `atlas/applicability.json` owns explicit main-catalog resource/place associations, and `atlas/places/*.md` owns resources that are canonical to one place.

`atlas/jurisdictions.json` is a separate legal-research routing model. Its federalism, district, territorial, and government-to-government relationships never authorize Atlas inheritance and never establish controlling law, resource applicability, eligibility, or legal advice.

## Working Principles

### Preserve intent and scope

- Make the smallest coherent change that fully solves the requested problem.
- Do not reorganize unrelated lists, rewrite descriptions merely for stylistic preference, or bundle opportunistic cleanup into focused work.
- Inspect existing conventions before introducing a new pattern.
- Preserve unrelated user changes in a dirty worktree.
- Prefer reversible changes and explicit migrations over destructive rewrites.

### Research before curating

- Open every proposed resource and verify its present purpose, ownership, accessibility, and canonical URL.
- Prefer official project pages, primary documentation, public agencies, original repositories, and authoritative registries.
- Use secondary sources only when they add distinct explanatory or discovery value.
- Remove tracking parameters, fragments that do not identify stable content, referral codes, and unnecessary redirectors.
- Do not infer pricing, licensing, medical efficacy, legal status, availability, or active maintenance without evidence.
- Use time-sensitive wording sparingly. Describe durable capabilities instead of brittle launch or status claims.

### Curate rather than accumulate

A resource belongs when it is useful enough to recommend intentionally, fits the collection's scope, and adds value that is not already represented. Do not add a link solely because it is adjacent to a topic.

Before adding anything, search the entire repository for:

- The exact and case-insensitive title.
- The exact URL.
- Canonical URL variants with or without `www`, a trailing slash, fragments, or tracking parameters.
- The underlying product or organization under a different title or source URL.

When a stronger canonical representation exists, update or migrate the existing entry rather than creating a duplicate. If a submission is redundant, stale, unsafe, placeholder-only, or too generic to be useful, omit it and record the reason in the pull request summary.

## Awesome List Contract

### Entry format

Use one resource per line:

```markdown
- [Resource Name](https://example.com/) - Concise factual description ending with punctuation. <!-- akashic-meta: {"id":"resource-name","resourceType":"website","role":"reference","authority":"official","access":["free"],"geography":["global"],"language":["en"],"platform":["web"],"account":"none","license":"proprietary","status":"active","volatility":"low","reviewTier":"annual"} -->
```

Each entry must:

- Use the resource's official name and preferred capitalization.
- Use a canonical HTTPS URL when available.
- Explain what the reader can do or find there.
- Avoid marketing language, unsupported superlatives, and vague phrases such as "a useful site."
- Disclose meaningful constraints such as paid access, trials, account requirements, institutional eligibility, regional scope, archival status, or experimental maturity.
- End with terminal punctuation.

### Stable identity and structured metadata

Every resource newly added by an agent must include a trailing `akashic-meta` JSON comment with an explicit stable `id` and the applicable controlled metadata from [`docs/resource-metadata.md`](docs/resource-metadata.md). This is mandatory even though legacy unannotated entries remain supported during incremental migration.

- Choose a descriptive repository-owned ID made of lowercase letters, numbers, and single hyphens. Search the repository and generated catalog before choosing it; IDs are globally unique.
- Treat the ID as permanent. Never derive a new ID because a title, owner, or canonical URL changes, and never recycle an ID from a removed resource.
- When a canonical URL changes, keep the ID, move the old HTTP(S) URL into `aliases`, and update the Markdown link. Do not put the current URL in `aliases`.
- Use only documented fields and controlled values. Record access, geography, language, platform, account, license, status, volatility, and review cadence when they apply; add sensitive scopes for medical, legal, financial, emergency, privacy, security, crisis, youth, or dual-use material.
- Keep `reviewed` (human truth review) distinct from `linkStatus` and `linkChecked` (machine-observable availability). Never infer one from the other.
- Give any main-catalog resource referenced by Atlas an explicit ID, and reference it from `atlas/applicability.json` with `resourceId`, never by canonical URL. Do not put resource applicability back into `atlas/locations.json`.
- Give every new Atlas country or subdivision the stable ID and external identifiers required by its checked-in registry. Verify codes against a primary authority; never invent a code or treat a map geometry ID as jurisdictional evidence.
- Keep jurisdiction identity independent from map coverage. A missing reviewed boundary must remain explicit rather than being replaced with a nearby, aggregate, or guessed geometry.
- Add Atlas inheritance only as an explicit, provenance-bearing edge in `atlas/applicability.json`. Never infer legal or service applicability from `parentId`, geometry, or map containment.
- Do not mass-backfill untouched legacy entries. Add explicit metadata when creating, reviewing, moving, or materially updating a resource.

Before an agent proposes or updates a pull request containing resources, it must run `node scripts/validate-collection.mjs`, `node --test`, the pinned Awesome Lint wrapper for every affected list, `node scripts/build-site.mjs`, and `node scripts/check-site.mjs`. A resource addition is incomplete if identity or metadata validation fails.

### Placement and ordering

- Place a resource in the narrowest appropriate subsection of the narrowest appropriate list.
- Preserve alphabetical ordering within sections unless the section clearly uses another intentional order.
- Prefer one canonical home for a resource across the entire repository.
- Add a new subsection only when it creates a durable distinction and arrives with enough resources to be useful.
- Add a new top-level list only when the subject cannot be represented clearly inside an existing collection and has enough depth to stand alone.

### Contents and headings

- Every list must contain a `## Contents` section.
- Every resource-bearing `##` heading must appear in `Contents`, and every `Contents` entry must resolve to a real heading.
- Keep headings concise, reader-facing, and stable because they become portal topics and URL-backed navigation state.
- Avoid renaming headings casually; a rename changes generated topic identity and can invalidate shared portal links.

### Counts and indexes

Resource counts are part of the repository contract.

- When a top-level list changes, update its count in the root `README.md`.
- When a nested list changes, update its count in its immediate hub and update the nested collection aggregate in the root `README.md`.
- When adding a top-level list, update `EXPECTED_TOP_LEVEL_LISTS` in `scripts/validate-collection.mjs` and add the root index entry.
- When adding or removing a nested child list, update `NESTED_COLLECTIONS` in `scripts/validate-collection.mjs` and the immediate hub.
- Never estimate counts. Run the validator and use its parsed totals.

## Collection-Specific Guardrails

### Awesome Abundance

Resources under `lists/awesome-abundance/` must provide a legitimate no-cost access path. State eligibility, quotas, library access, regional limits, account requirements, or paid upgrades when relevant. Temporary trials, deceptive "free" funnels, piracy, and referral schemes do not qualify.

### Health, neuroscience, and psychedelics

- Prefer primary literature, registries, professional bodies, government guidance, and established harm-reduction organizations.
- Separate evidence, education, peer support, clinical access, and commercial training accurately.
- Do not turn research findings into personal medical advice.
- Preserve collection-level safety advisories and strengthen them when scope expands.
- Clearly distinguish emergency services from non-emergency peer support.
- Avoid language that normalizes unsupervised drug use or overstates treatment evidence.

### Security, privacy, watermark, and dual-use tools

- Frame offensive, bypass, removal, scanning, and analysis tools around authorized testing, owned content, interoperability, preservation, research, or defensive use.
- Do not provide operational instructions for abuse, evasion, unauthorized access, or removal of protections from content the user does not control.
- Preserve relevant safety and rights notices when editing these sections.

### Spirituality, religion, and occult knowledge

- Represent traditions respectfully and avoid presenting metaphysical claims as established scientific fact.
- Prefer primary texts, academic resources, museums, archives, living communities, and critical scholarship.
- Distinguish historical description, contemporary practice, personal belief, and empirical evidence.

## Static Portal Contract

### Data flow

The portal is generated as follows:

```text
README.md + lists/**/README.md
        -> scripts/build-site.mjs
        -> dist/data/catalog.json + copied site assets
        -> scripts/check-site.mjs
        -> GitHub Pages
```

Do not introduce a second manually maintained catalog. If the portal needs new metadata, encode it in a documented Markdown convention or derive it deterministically in the build script.

### Generated data requirements

Each resource must retain its:

- Stable ID, former-URL aliases, and structured metadata.
- Title, canonical URL, and description.
- Domain.
- Collection title and slug.
- Nested group title and slug when applicable.
- Section/topic.
- Canonical Markdown source path.

When changing catalog shape, update the generator, site consumers, and `scripts/check-site.mjs` together. Preserve backward-compatible fields unless a deliberate migration is documented.

### Front-end constraints

- Keep the portal dependency-free unless the user explicitly approves a dependency and its long-term maintenance cost.
- Preserve progressive enhancement: the Markdown lists remain useful without JavaScript or the portal.
- Keep catalog state synchronized across collection cards, search, filters, saved resources, mind-map navigation, browser history, and shareable URLs.
- Avoid rebuilding large DOM regions unnecessarily during high-frequency interactions such as search typing.
- Treat mobile behavior as first-class, including narrow phones, touch input, browser scrolling, and reduced viewport heights.
- Do not make users depend on hover, precision pointing, or zooming to discover labels or actions.

### Accessibility

For every interface change:

- Use native interactive elements where possible.
- Preserve visible focus, logical tab order, meaningful accessible names, and keyboard activation.
- Return or hand off focus when a control hides itself or navigation replaces focused content.
- Keep touch targets approximately 44 by 44 CSS pixels where practical.
- Maintain sufficient contrast in both themes.
- Honor `prefers-reduced-motion`, including JavaScript-triggered scrolling and animation.
- Avoid redundant live regions and excessive announcements.
- Ensure SVG or canvas visualizations have an equivalent native control or list path.
- Test mobile scrolling so maps, drawers, and overlays do not trap wheel or touch gestures.

### Localization

- Keep English canonical and default. Generate locale routes from the shared source HTML and catalogs; never fork the portal or resource catalog by language.
- Preserve locale key parity, named placeholders, fallback metadata, native language names, `lang`, `dir`, canonical URLs, and `hreflang` alternates.
- Use `Intl.NumberFormat` and `Intl.PluralRules` instead of English-only count concatenation.
- Mark canonical English resource, taxonomy, advisory, place, and theme content with `lang="en"` when it appears inside a non-English document.
- Never infer locale from IP address or use flags as language labels. Preserve a user's explicit language choice and URL state.
- Treat machine translation as a draft requiring human review. Follow `docs/localization.md` when adding a locale or expanding the translation boundary.

### Need-first navigation and guides

- Follow `docs/navigation.md` when changing guide markers, need paths, search concepts, taxonomy controls, source links, or related paths.
- Keep collection guidance inside canonical Markdown and generate its safe portal representation during the build.
- Treat reviewed aliases as vocabulary bridges, not a second resource catalog or a place to restate resource facts.
- Preserve the frozen search baseline when adding a versioned search algorithm and commit a deterministic comparison report.

### Mind-map behavior

- Collection, group, and topic selection must agree with catalog state and URL state.
- Dense collections must remain legible through collision-aware layout, scalable spacing, wrapping, and an accessible selector or list fallback.
- Labels must expose full names even when the visual presentation is truncated.
- Pointer coordinate math must account for SVG transforms and the rendered viewport.
- Expanded presentation must manage focus and short viewports safely.
- A browse action must reveal the catalog, close any obstructing overlay, and move keyboard focus to a meaningful catalog target.

## Code and Style

- Follow `.editorconfig`: UTF-8, LF line endings, final newlines, two-space indentation, and no trailing whitespace outside intentional Markdown line breaks.
- Use modern JavaScript modules and Node.js built-ins; no transpilation step exists.
- Prefer `const`, small focused functions, explicit names, and early validation.
- Use double quotes in JavaScript and shell examples unless another form prevents escaping or preserves literal content more safely.
- Use long-form command options when they are portable and unambiguous.
- Escape data before inserting HTML. Prefer `textContent` and DOM APIs for untrusted or Markdown-derived values.
- Permit only expected URL schemes in generated links.
- Do not add secrets, tokens, personal data, analytics, trackers, or remote scripts without explicit approval.
- Keep the visual identity aligned with the existing Ego Hygiene cosmic design system rather than introducing an unrelated component style.

## Validation

Run checks from the repository root.

### Collection changes

Always run:

```sh
node scripts/validate-collection.mjs
```

For each affected resource list, reproduce the repository's Awesome Lint wrapper rather than linting the raw root portal. The workflow temporarily disables collection-wide rules that are enforced elsewhere:

```sh
awesome_list_readme="lists/example/README.md"
awesome_list_directory="$(dirname "${awesome_list_readme}")"
awesome_lint_input="${awesome_list_directory}/.awesome-lint-input.md"

{
  printf "%s\n" "<!--lint disable awesome-contributing awesome-github double-link-->"
  sed '1{/^<!--lint disable awesome-git-repo-age-->$/d;}' "${awesome_list_readme}"
} > "${awesome_lint_input}"

npx --yes "awesome-lint@2.3.0" "${awesome_lint_input}"
rm "${awesome_lint_input}"
```

Remove temporary `.awesome-lint-input.md` files even when lint fails.

### Portal or list changes

Because list edits alter generated data, run:

```sh
node scripts/build-site.mjs
node scripts/check-site.mjs
```

### Dependency-free tests

Run the focused parser, URL-identity, collection-identity, and Atlas schema suite:

```sh
node --test
```

### JavaScript changes

Run syntax checks for every edited script, for example:

```sh
node --check scripts/build-site.mjs
node --check site/app.js
node --check site/mind-map.js
```

Then exercise the affected behavior in a real browser at representative desktop and mobile widths. For interface work, test keyboard-only operation, touch-equivalent behavior, both themes, reduced motion, deep links, browser Back/Forward, empty states, and failure states as applicable.

### Final hygiene

Before publishing:

```sh
git diff --check
find lists -name ".awesome-lint-input.md" -print
```

The `find` command must produce no output.

## GitHub Actions and Deployment

- `awesome-lint.yml` validates Markdown changes independently from Pages deployment.
- `pages.yml` intentionally builds and deploys on every push to `main`; do not make it depend on currently unreliable unrelated checks unless explicitly requested.
- When editing workflows, use current stable major versions of official actions and verify permissions remain least-privilege.
- Keep Pages generation deterministic and free of credentials.
- Do not commit generated `dist/` changes merely to deploy; the Pages workflow builds from Markdown and `site/` sources.

## Pull Request Discipline

- Start from the latest `main` commit.
- Use a focused `agent/<description>` branch when creating a branch for automated work.
- Stage or upload only files belonging to the requested change.
- Use a terse imperative commit message and a PR title that describes the complete diff.
- Default to a draft pull request unless the user asks for ready-for-review status.
- Explain what changed, why it belongs, curation exclusions or migrations, affected lists, count changes, and validation performed.
- Never claim checks passed unless they were run against the exact proposed tree.
- After opening a PR, monitor its relevant checks and investigate failures before handoff.

## Definition of Done

A change is complete only when:

- Every new resource is verified, canonical, distinct, well described, and correctly placed.
- Contents entries, headings, indexes, and counts agree.
- Collection validation passes.
- Affected lists pass the same Awesome Lint configuration used in CI.
- The site builds and generated-site checks pass whenever lists or portal sources changed.
- Relevant browser, responsive, keyboard, and accessibility behavior is verified for UI work.
- No temporary lint input, generated clutter, secrets, or unrelated edits remain.
- The pull request accurately documents the result and its live checks are green.
