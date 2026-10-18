# Localization architecture

Akashic publishes English as its canonical and default language. A shared locale registry drives the Portal, Observatory, and Atlas; adding a supported language does not require another portal, resource catalog, or language-specific runtime branch.

Russian remains the reference interface locale. Spanish, French, Brazilian Portuguese, and Arabic are complete AI-generated interface drafts. Their routes and language choices disclose that they need human language review. A reference locale is a system example, and a draft is an available translation; neither status implies professional linguistic certification.

The portal stays dependency-free and compatible with static GitHub Pages. No translation service receives a visitor's browsing, search, or location data.

## Translation boundary

The Portal, Observatory, and Atlas localize:

- Page metadata, navigation, headings, explanations, controls, accessible names, statuses, and errors.
- Build-generated funding-link accessible names.
- Runtime counts and percentages through `Intl.NumberFormat` and grammatical forms through `Intl.PluralRules`.
- Locale routes, canonical URLs, `hreflang` alternates, document language, and text direction.

Curated resource titles, descriptions, collection guides, taxonomy, advisories, geographic names, and Atlas theme metadata remain in canonical English. Localized pages disclose that boundary. Canonical passages retain `lang="en"`; Arabic layouts also keep English text and identifiers readable without mirroring geographic maps or reversing numbers.

The language offer means “use this interface language.” It does not claim to translate the knowledge base or the external resources it links to.

## Registry, routes, and shared assets

`site/i18n/locales.json` declares canonical BCP 47 tags, English and native names, direction, a unique route, translation status, and fallback:

| Locale | Status | Route prefix | Direction |
| --- | --- | --- | --- |
| English (`en`) | Canonical and default | `/` | Left to right |
| Russian (`ru`) | Reference | `/ru/` | Left to right |
| Spanish (`es`) | AI draft | `/es/` | Left to right |
| French (`fr`) | AI draft | `/fr/` | Left to right |
| Brazilian Portuguese (`pt-BR`) | AI draft | `/pt-br/` | Left to right |
| Arabic (`ar`) | AI draft | `/ar/` | Right to left |

Every prefix publishes `index.html`, `dashboard.html`, and `atlas.html`. Routes assume the site's existing root deployment at `https://akashic.egohygiene.io`; the same absolute paths work on a root-served local preview. Hosting under an arbitrary project subpath requires a separate base-path change across the portal. A locale owns one folder; nested prefixes and reserved asset/data folders are rejected. English alone owns `/` and has no fallback. Every other fallback chain must reach English without cycles. Codes and routes are unique, and regional code casing remains canonical even when its route uses lowercase.

Localized HTML is generated at publish time from shared source HTML. JavaScript, CSS, icons, geometry, and generated resource data remain single-copy root assets. Module-relative data URLs let the same scripts work from every route. Current generated pages need no translation-catalog requests. Catalog JSON files under `i18n/` remain available for validation and older clients; a compatibility path can load active and English messages when older cached HTML lacks the embedded snapshot.

Each page embeds a script-safe JSON snapshot containing its active interface messages and merged fallback messages from the same build. Nearer fallback locales take precedence over more distant ones. The default page uses English for both. This avoids making catalog startup depend on a second translation request or mixing a cached page with newer message files. The embedded payload contains interface wording, never a duplicate resource catalog or visitor data.

A separate small JSON configuration identifies the active page and registered language routes. It includes translated language-offer wording for each available target, so an offer can be read in that language without loading every catalog. JSON serialization escapes script delimiters and HTML-sensitive characters.

## Language selection and browser suggestions

The header uses native language names without flags. A visible label, native select, and explicit Apply button let readers inspect choices before navigating. AI draft options are labeled. An ordinary language-link disclosure remains usable without JavaScript; the form starts hidden and becomes available only after its submit handler is ready. It has no named form field or GET action that could submit an unintended request.

The browser locale is a suggestion, not permission to navigate:

- An explicit locale URL is respected. A saved explicit choice can restore that language when entering the default English route.
- Without a saved choice, browser language preferences are matched locally in preference order against available locales. A regional preference may use a supported broader language (`es-MX` to `es`), while unavailable sibling regions or scripts are not guessed.
- A supported different language produces an optional inline offer with native wording. It does not take focus, open a modal, or navigate automatically. Unsupported languages leave the current interface available with the selector.
- Accepting or explicitly selecting a language stores only that locale code in `localStorage`. Keeping the current language can also record that explicit preference. Storage failures leave navigation usable.
- No IP lookup, geolocation permission, server language profile, or remote translation request is used. Browser preferences are not persisted as a list.

Language navigation keeps the corresponding page, non-sensitive explorer parameters, and fragments. Natural-language search remains in page memory by default. An explicitly shared `#catalog?q=…` fragment survives a language change; a legacy `?q=…` value is removed from the next request and migrated to the fragment. If both exist, the explicit fragment takes precedence. Switching languages reloads the page and does not promote a privately typed query into a URL or storage.

These choices follow W3C guidance for [linking to translations](https://www.w3.org/International/questions/qa-site-conneg.en.html) and [identifying page language changes](https://www.w3.org/WAI/test-evaluate/easy-checks/language/).

## Message catalogs and review

`site/i18n/<code>.json` catalogs use stable message identifiers. The build rejects invalid catalog shapes, different key sets, empty messages, mismatched named placeholders, and conflicting static translations of the same English wording.

- Keys beginning with `static.` localize source HTML text and selected translatable attributes at build time. Replacement happens once, escapes target text, and leaves scripts, styles, comments, and URLs alone.
- Keys beginning with `runtime.` are consumed by `site/i18n.js` and page modules.
- Interpolations use named placeholders such as `{language}`, `{title}`, and `{count}`. Translations preserve the placeholder set but may reorder it.
- Every plural family includes `.zero`, `.one`, `.two`, `.few`, `.many`, and `.other`. `Intl.PluralRules` selects the grammatical category, and `Intl.NumberFormat` formats the count. Arabic exercises all six categories; Russian exercises `few` and `many`. Categories may share wording when appropriate for the language. See [Unicode CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules).
- Complete messages with placeholders are preferred over concatenated sentence fragments.

English messages own source wording. Reuse a common key when its meaning is identical. Static keys with the same English source cannot have different target translations because source HTML replacement would be ambiguous.

AI assistance can produce an initial interface catalog. Publish it with `status: "draft"` and the visible AI draft disclosure; do not mark it reviewed or invent a human reviewer. Human review should assess meaning, tone, accessible labels, longer text, plurals, and the actual rendered surfaces. Translation review is separate from resource truth review, source availability, or program eligibility.

## Adding a locale

1. Add a registry record with a canonical tag, native name, direction, unique single-folder route, honest status, and fallback.
2. Copy the English catalog to `<code>.json`, set its `locale`, and preserve every key and placeholder. Translate complete interface wording, including browser offers, draft disclosures, errors, and all plural categories.
3. Keep AI output visibly marked as a draft until human language review is recorded. Do not fill the resource catalog with translated copies.
4. Confirm native language selection, supported regional matching, unsupported preferences, saved choices, direct links, browser history, query privacy, and unavailable storage.
5. Check narrow mobile widths, long labels, both themes, keyboard navigation, focus order, and language changes. RTL publication requires deliberate logical-layout, mixed English text, map, identifier, and number checks.
6. Run the complete validation sequence below and the browser checks. Update bootstrap asset accounting when a shared runtime dependency changes; keep existing transfer limits.
7. Submit a focused pull request recording translation origin, outstanding human review, and tested surfaces.

## Validation

Run from the repository root:

```sh
node --test
node scripts/validate-collection.mjs
node scripts/build-site.mjs
node scripts/check-site.mjs
node --check scripts/lib/i18n.mjs
node --check scripts/build-site.mjs
node --check scripts/check-site.mjs
node --check site/i18n.js
node --check site/locale-navigation.js
node --check site/app.js
node --check site/dashboard.js
node --check site/mind-map.js
node --check site/atlas.js
node scripts/benchmark-search.mjs --profile standard
git diff --check
```

The generated-site check follows the registry rather than a fixed language list. It verifies routes, `lang` and `dir`, canonical and alternate URLs, every language option and progressive link, explicit-submit controls, matching embedded message snapshots, coverage and draft disclosures, shared root assets, module-relative data access, fallback formatting, and the absence of duplicated locale resource data. Unit tests cover invalid metadata and fallback graphs, regional and RTL generation, placeholder and plural contracts, escaped non-cascading replacement, and script-safe embedded JSON.

Browser validation remains necessary for layout, keyboard operation, focus, and optional suggestion behavior. A passing metadata check does not certify linguistic quality.

## Knowledge-base translation remains separate

This foundation prepares the remaining localization issues without implementing or closing them:

- [#178](https://github.com/egohygiene/akashic/issues/178): an offline content-overlay contract keyed by stable identities, with source fingerprints, translation provenance, and validation of draft, reviewed, and stale states.
- [#179](https://github.com/egohygiene/akashic/issues/179): a bounded reviewed Russian discovery-label pilot for two collections, at most ten topics, and three need paths. Resource descriptions remain English; this is not full search translation.
- [#180](https://github.com/egohygiene/akashic/issues/180): reviewed Atlas labels for five existing places, with explicit source language and no changes to geography, authority, or resource applicability.

Future overlays must preserve one canonical resource, collection, section, or place identity and its source URL. Legal summaries and other time-sensitive translations need stricter provenance, source jurisdiction, source URL, effective or checked dates, review status, and appropriate non-advice wording. Interface translation does not establish legal or service applicability and does not grant eligibility.
