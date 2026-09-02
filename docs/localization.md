# Localization architecture

Akashic publishes English as its canonical and default language. Russian is the complete reference locale used to prove that routing, fallback, formatting, accessibility, and contribution checks work beyond English. A reference locale verifies the system; it is not a claim of professional linguistic certification.

The portal stays dependency-free and compatible with static GitHub Pages. Localization is a deterministic presentation layer over one canonical resource catalog, not a second catalog.

## What is localized

The Portal, Observatory, and Atlas localize:

- Page metadata, navigation, headings, explanations, controls, accessible names, statuses, and errors.
- Build-generated funding-link accessible names.
- Runtime counts through `Intl.NumberFormat` and grammatical forms through `Intl.PluralRules`.
- Locale routes, canonical URLs, `hreflang` alternates, document language, and text direction.

Curated resource titles, descriptions, taxonomy, advisories, geographic names, and Atlas theme metadata remain in canonical English until a human-reviewed content-translation layer exists. Localized pages disclose that boundary. Runtime-generated canonical passages receive `lang="en"` so assistive technology can switch pronunciation rules.

## Routes and shared assets

The locale registry in `site/i18n/locales.json` declares BCP 47 language tags, native names, direction, route, status, and fallback:

| Locale | Status | Routes |
| --- | --- | --- |
| English (`en`) | Canonical and default | `/`, `/dashboard.html`, `/atlas.html` |
| Russian (`ru`) | Reference | `/ru/`, `/ru/dashboard.html`, `/ru/atlas.html` |

Localized HTML is generated at publish time. JavaScript, CSS, icons, geometry, and generated catalog JSON remain single-copy root assets. Module-relative data URLs let the same scripts work from every locale route without duplicating the 4,000-plus-resource payload.

The visible language switcher uses native language names instead of flags. It preserves non-sensitive explorer parameters and fragments, stores only an explicit user choice in `localStorage`, and never infers language from an IP address. Natural-language search remains in page memory; an explicitly copied fragment link survives a locale redirect, while a legacy `?q=` value is moved into the fragment before the second request. English remains the fallback when a message is unavailable. These choices follow W3C guidance for [linking to translations](https://www.w3.org/International/questions/qa-site-conneg.en.html) and [identifying page language changes](https://www.w3.org/WAI/test-evaluate/easy-checks/language/).

## Message catalogs

`site/i18n/en.json` and `site/i18n/ru.json` use stable message identifiers. The build fails when locale catalogs have different keys, empty messages, or mismatched placeholders.

- Keys beginning with `static.` localize source HTML text and selected translatable attributes at build time.
- Keys beginning with `runtime.` are consumed by `site/i18n.js` and the page modules.
- Interpolations use named placeholders such as `{title}` and `{count}`. A translation must preserve the exact placeholder set, but may reorder placeholders.
- Plural families end in `.one`, `.few`, `.many`, and `.other`. The runtime selects the correct form with `Intl.PluralRules`; Russian exercises the additional `few` and `many` categories documented by [Unicode CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules).
- Never concatenate translated sentence fragments when a complete message with placeholders can express the idea.

English catalog messages are the source wording. Reuse an existing common key when the English and translated meaning are identical. Do not add two keys with the same English source text when their target translations need to differ, because build-time static replacement is intentionally deterministic.

## Adding a locale

1. Add one registry record to `site/i18n/locales.json` with a valid language tag, native name, `ltr` or `rtl` direction, unique route, review status, and fallback.
2. Copy `site/i18n/en.json` to a file named for the locale and preserve every message key and placeholder.
3. Translate the interface messages. Do not publish raw machine translation as reviewed copy; use machine output only as an explicitly reviewed draft.
4. Confirm the locale's plural categories and update all plural-family messages even when some forms share wording.
5. Check narrow mobile widths, long labels, both themes, keyboard navigation, focus order, and screen-reader language changes. An RTL locale also requires a deliberate logical-layout review.
6. Run the complete validation sequence below.
7. Submit the locale as a focused pull request and record who reviewed the translation and which surfaces were checked.

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
node --check site/app.js
node --check site/dashboard.js
node --check site/mind-map.js
node --check site/atlas.js
git diff --check
```

The generated-site check verifies locale routes, `lang` and `dir`, canonical and alternate URLs, current-language navigation, funding links, Russian coverage copy, shared root assets, module-relative data access, message fallback, number and plural formatting, and the absence of duplicated locale data.

## Planned extensions

The architecture intentionally leaves room for reviewed overlays keyed by stable collection, section, resource, and place identifiers. Those overlays can translate discovery metadata without forking Markdown or changing canonical URLs. Legal summaries and other time-sensitive material need a stricter provenance record: source jurisdiction, source URL, effective or checked date, review state, and an explicit non-advice warning. Locale expansion should follow the same human-directed pull-request workflow rather than silently publishing automated changes.
