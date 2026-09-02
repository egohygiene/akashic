import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadLocales, localePagePath } from "./lib/i18n.mjs";
import { validateResourceIdentities, validateResourceMetadata } from "./lib/resource-metadata.mjs";

const output = path.join(process.cwd(), "dist");
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const rankedCounts = (values, limit = Infinity) => {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
};
for (const relativePath of ["index.html", "dashboard.html", "atlas.html", "ru/index.html", "ru/dashboard.html", "ru/atlas.html", "styles.css", "dashboard.css", "atlas.css", "app.js", "favorites.js", "catalog-metadata.js", "dashboard.js", "needs.js", "search.js", "search/and-substring-v1.js", "search/concepts-v1.js", "search/weighted-lexical-v2.js", "mind-map.js", "atlas.js", "i18n.js", "i18n/locales.json", "i18n/en.json", "i18n/ru.json", "assets/favicon.svg", "data/catalog.json", "data/overview.json", "data/funding.json", "data/atlas.json", "data/atlas-themes.json", "data/geometry/countries-110m.json", "data/geometry/states-albers-10m.json", ".nojekyll"]) {
  await access(path.join(output, relativePath));
}

const atlas = JSON.parse(await readFile(path.join(output, "data/atlas.json"), "utf8"));
if (atlas.schemaVersion !== 2) throw new Error("Unsupported atlas schema.");
if (!Array.isArray(atlas.locations) || atlas.locations.length !== atlas.locationCount) throw new Error("The atlas location count is inconsistent.");
if (!Array.isArray(atlas.resources) || atlas.resources.length !== atlas.resourceCount) throw new Error("The atlas resource count is inconsistent.");
const locations = new Map(atlas.locations.map((location) => [location.id, location]));
if (!locations.has(atlas.rootId)) throw new Error("The atlas root location is missing.");
for (const location of atlas.locations) {
  if (!location.id || !location.name || !location.kind || !location.geometry || !location.camera || !Array.isArray(location.children)) throw new Error(`Incomplete atlas location: ${location.id || "unknown"}`);
  if (location.geometry.dataset === "point") {
    const validMapPosition = Array.isArray(location.geometry.mapPosition) && location.geometry.mapPosition.length === 2 && location.geometry.mapPosition.every((value) => Number.isFinite(value) && value >= 0 && value <= 1);
    if (!validMapPosition) throw new Error(`Invalid atlas point map position for ${location.id}.`);
  }
  if (location.parentId && !locations.has(location.parentId)) throw new Error(`Unknown atlas parent for ${location.id}.`);
  for (const childId of location.children) {
    if (locations.get(childId)?.parentId !== location.id) throw new Error(`Broken atlas hierarchy at ${location.id} / ${childId}.`);
  }
  const exactCount = atlas.resources.filter((resource) => resource.locationId === location.id).length;
  if (exactCount !== location.resourceCount) throw new Error(`Atlas resource count is inconsistent for ${location.name}.`);
}
const atlasUrls = atlas.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, ""));
if (new Set(atlasUrls).size !== atlasUrls.length) throw new Error("The atlas contains duplicate normalized URLs.");
for (const resource of atlas.resources) {
  if (!resource.id || !resource.title || !resource.description || !resource.domain || !resource.section || !resource.locationId || !resource.source) throw new Error(`Incomplete atlas resource: ${resource.url}`);
  if (!["resource", "index"].includes(resource.role)) throw new Error(`Unsupported atlas role: ${resource.role}`);
  if (!locations.has(resource.locationId)) throw new Error(`Atlas resource has unknown location: ${resource.url}`);
  new URL(resource.url);
}

const themes = JSON.parse(await readFile(path.join(output, "data/atlas-themes.json"), "utf8"));
if (!Array.isArray(themes.themes) || themes.themes.length < 3) throw new Error("The atlas needs a useful set of map themes.");
if (!themes.themes.some((theme) => theme.id === themes.defaultTheme)) throw new Error("The default atlas theme is missing.");
for (const theme of themes.themes) {
  for (const color of ["ocean", "land", "landHover", "available", "selected", "boundary", "grid", "marker", "label"]) {
    if (!/^#[0-9a-f]{6}$/i.test(theme.colors?.[color] || "")) throw new Error(`Atlas theme ${theme.id} is missing ${color}.`);
  }
}

const catalog = JSON.parse(await readFile(path.join(output, "data/catalog.json"), "utf8"));
if (catalog.schemaVersion !== 2) throw new Error("Unsupported catalog schema.");
if (!Array.isArray(catalog.categories) || catalog.categories.length < 1) throw new Error("The catalog has no categories.");
if (!Array.isArray(catalog.resources) || catalog.resources.length < 1) throw new Error("The catalog has no resources.");
if (catalog.resourceCount !== catalog.resources.length) throw new Error("The catalog resource count is inconsistent.");
for (const category of catalog.categories) {
  if (!Array.isArray(category.sections) || category.sections.length < 1) throw new Error(`Collection has no mind-map topics: ${category.title}`);
  if (!category.color || !category.glyph) throw new Error(`Collection has no visual identity: ${category.title}`);
  if (!Array.isArray(category.groups) || category.groups.length < 1) throw new Error(`Collection has no mind-map groups: ${category.title}`);
  const categoryResources = catalog.resources.filter((resource) => resource.categorySlug === category.slug);
  if (categoryResources.length !== category.count) throw new Error(`Collection count is inconsistent for ${category.title}.`);
  const expectedSections = new Map();
  for (const resource of categoryResources) expectedSections.set(resource.section, (expectedSections.get(resource.section) || 0) + 1);
  if (expectedSections.size !== category.sections.length) throw new Error(`Mind-map topic list is inconsistent for ${category.title}.`);
  for (const section of category.sections) {
    if (expectedSections.get(section.title) !== section.count) throw new Error(`Mind-map topic count is inconsistent for ${category.title} / ${section.title}.`);
  }
  const groupedCount = category.groups.reduce((sum, group) => sum + group.count, 0);
  if (groupedCount !== category.count) throw new Error(`Mind-map group count is inconsistent for ${category.title}.`);
  for (const group of category.groups) {
    const groupResources = categoryResources.filter((resource) => resource.groupSlug === group.slug);
    if (groupResources.length !== group.count) throw new Error(`Mind-map group count is inconsistent for ${category.title} / ${group.title}.`);
    const groupSectionCount = group.sections.reduce((sum, section) => sum + section.count, 0);
    if (groupSectionCount !== group.count) throw new Error(`Mind-map group topics are inconsistent for ${category.title} / ${group.title}.`);
    if (!group.source) throw new Error(`Collection branch has no canonical source: ${category.title} / ${group.title}.`);
  }
  if (category.guide && (!category.guide.source || !category.guide.html.includes("guide-warning") || !category.guide.html.includes("<h3>") || /<script/i.test(category.guide.html))) throw new Error(`Collection guide is incomplete or unsafe for ${category.title}.`);
  if (!Array.isArray(category.relatedPaths)) throw new Error(`Related paths are invalid for ${category.title}.`);
  for (const related of category.relatedPaths) {
    if (!catalog.categories.some((candidate) => candidate.slug === related.categorySlug)) throw new Error(`Related path points to an unknown collection: ${category.title} / ${related.title}.`);
  }
}
if (catalog.categories.filter((category) => category.guide).length < 3) throw new Error("Business, Travel, and Legal collection guides were not published.");

const urls = catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/\/$/, ""));
if (new Set(urls).size !== urls.length) throw new Error("The catalog contains duplicate normalized URLs.");
for (const resource of catalog.resources) {
  if (!resource.id || !["explicit", "derived"].includes(resource.idOrigin) || !Array.isArray(resource.aliases) || !resource.metadata || !resource.title || !resource.description || !resource.category || !resource.section || !resource.source || !Number.isInteger(resource.sourceLine) || resource.groupSlug === undefined) throw new Error(`Incomplete resource: ${resource.url}`);
  if (!Array.isArray(resource.accessLabels)) throw new Error(`Resource access labels are invalid: ${resource.url}`);
  if (resource.accessLabels.some((label) => !label || /[*_]/.test(label))) throw new Error(`Resource access label contains Markdown: ${resource.url}`);
  validateResourceMetadata({ id: resource.idOrigin === "explicit" ? resource.id : undefined, aliases: resource.aliases.length ? resource.aliases : undefined, ...resource.metadata }, resource.source);
  new URL(resource.url);
}
validateResourceIdentities(catalog.resources);
if (!catalog.resources.some((resource) => resource.idOrigin === "explicit" && Object.keys(resource.metadata).length)) throw new Error("The catalog has no explicitly structured resource metadata.");
const creativeTools = catalog.resources.filter((resource) => resource.groupSlug === "creative-tools-and-production");
if (!creativeTools.length || creativeTools.some((resource) => /^\*\*/.test(resource.description))) throw new Error("Creative Tools access labels were not structurally extracted.");

const overview = JSON.parse(await readFile(path.join(output, "data/overview.json"), "utf8"));
if (overview.schemaVersion !== 1) throw new Error("Unsupported overview schema.");
if (overview.resourceCount !== catalog.resourceCount) throw new Error("The overview resource count is inconsistent.");
if (overview.collectionCount !== catalog.categories.length || overview.categories.length !== catalog.categories.length) throw new Error("The overview collection count is inconsistent.");
const expectedSourceFileCount = new Set(catalog.resources.map((resource) => resource.source)).size;
const expectedTopicPathCount = catalog.categories.reduce((sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + group.sections.length, 0), 0);
const expectedUniqueDomainCount = new Set(catalog.resources.map((resource) => resource.domain)).size;
if (overview.sourceFileCount !== expectedSourceFileCount) throw new Error("The overview source-list count is inconsistent.");
if (overview.topicPathCount !== expectedTopicPathCount) throw new Error("The overview topic-path count is inconsistent.");
if (overview.uniqueDomainCount !== expectedUniqueDomainCount) throw new Error("The overview domain count is inconsistent.");
if (overview.categories.reduce((sum, category) => sum + category.count, 0) !== catalog.resourceCount) throw new Error("The overview collection distribution is inconsistent.");
const overviewCategoryBySlug = new Map(overview.categories.map((category) => [category.slug, category]));
if (overviewCategoryBySlug.size !== overview.categories.length) throw new Error("The overview contains duplicate collection slugs.");
for (const catalogCategory of catalog.categories) {
  const category = overviewCategoryBySlug.get(catalogCategory.slug);
  if (!category || category.title !== catalogCategory.title || category.count !== catalogCategory.count || category.color !== catalogCategory.color || category.glyph !== catalogCategory.glyph) throw new Error(`Overview collection mismatch: ${catalogCategory.title}.`);
  const resources = catalog.resources.filter((resource) => resource.categorySlug === category.slug);
  if (category.sourceFileCount !== new Set(resources.map((resource) => resource.source)).size) throw new Error(`Overview source-list mismatch: ${category.title}.`);
  if (category.uniqueDomainCount !== new Set(resources.map((resource) => resource.domain)).size) throw new Error(`Overview domain mismatch: ${category.title}.`);
  if (category.topicPathCount !== catalogCategory.groups.reduce((sum, group) => sum + group.sections.length, 0)) throw new Error(`Overview topic-path mismatch: ${category.title}.`);
  if (!Array.isArray(category.groups) || category.groups.reduce((sum, group) => sum + group.count, 0) !== category.count) throw new Error(`Overview group mismatch: ${category.title}.`);
}
const expectedTopDomains = rankedCounts(catalog.resources.map((resource) => resource.domain), 12).map(({ name, count }) => ({ domain: name, count }));
if (JSON.stringify(overview.topDomains) !== JSON.stringify(expectedTopDomains)) throw new Error("The overview domain ranking is inconsistent.");
const expectedTopPaths = catalog.categories.flatMap((category) => category.groups.flatMap((group) => group.sections.map((section) => ({
  title: section.title,
  count: section.count,
  categoryTitle: category.title,
  categorySlug: category.slug,
  categoryColor: category.color,
  categoryGlyph: category.glyph,
  groupTitle: group.title,
  groupSlug: group.slug,
})))).sort((left, right) => right.count - left.count || left.categoryTitle.localeCompare(right.categoryTitle) || left.title.localeCompare(right.title)).slice(0, 12);
if (JSON.stringify(overview.topPaths) !== JSON.stringify(expectedTopPaths)) throw new Error("The overview topic ranking is inconsistent.");

const funding = JSON.parse(await readFile(path.join(output, "data/funding.json"), "utf8"));
if (funding.schemaVersion !== 1 || !Array.isArray(funding.sources) || funding.sources.length < 1) throw new Error("The funding data is invalid.");
const fundingUrls = new Set();
for (const source of funding.sources) {
  if (!source.platform || !source.value || !source.label || !source.glyph || !source.url) throw new Error("A funding source is incomplete.");
  const url = new URL(source.url);
  if (url.protocol !== "https:" || fundingUrls.has(source.url)) throw new Error(`Invalid or duplicate funding URL: ${source.url}`);
  fundingUrls.add(source.url);
}
const locales = await loadLocales(output);
const pages = ["index.html", "dashboard.html", "atlas.html"];
for (const locale of locales.locales) {
  for (const fileName of pages) {
    const relativePath = locale.code === locales.defaultLocale ? fileName : path.join(locale.route.replace(/^\//, ""), fileName);
    const html = await readFile(path.join(output, relativePath), "utf8");
    const pagePath = localePagePath(locale, fileName);
    if (!html.includes(`<html lang="${locale.code}" dir="${locale.direction}">`)) throw new Error(`Locale metadata is incorrect in ${relativePath}.`);
    if (!html.includes(`<link rel="canonical" href="https://akashic.egohygiene.io${pagePath}">`)) throw new Error(`Canonical locale URL is incorrect in ${relativePath}.`);
    for (const alternate of locales.locales) {
      if (!html.includes(`hreflang="${alternate.code}" href="https://akashic.egohygiene.io${localePagePath(alternate, fileName)}"`)) throw new Error(`Alternate locale ${alternate.code} is missing from ${relativePath}.`);
    }
    if (!html.includes('class="language-switcher"') || !html.includes(`data-locale="${locale.code}" aria-current="page"`)) throw new Error(`Language navigation is incomplete in ${relativePath}.`);
    if (html.includes("<!-- akashic-locale-") || html.includes("<!-- akashic-language-switcher -->")) throw new Error(`Locale placeholders remain in ${relativePath}.`);
    if (locale.code === locales.defaultLocale && html.includes('class="locale-coverage"')) throw new Error(`The canonical locale should not show a translation-coverage warning in ${relativePath}.`);
    if (locale.code !== locales.defaultLocale) {
      if (!html.includes('class="locale-coverage"') || !/[А-Яа-яЁё]/.test(html)) throw new Error(`The reference translation is incomplete in ${relativePath}.`);
      if (!html.includes('href="../styles.css"') || !html.includes('src="../')) throw new Error(`Localized routes do not reuse root assets in ${relativePath}.`);
    }
    if (html.includes("<!-- akashic-funding-badges -->")) throw new Error(`Funding badges were not generated in ${fileName}.`);
    for (const source of funding.sources) {
      if (!html.includes(`href="${escapeHtml(source.url)}"`)) throw new Error(`Funding source ${source.label} is missing from ${fileName}.`);
    }
  }
}

const homeHtml = await readFile(path.join(output, "index.html"), "utf8");
for (const marker of ["need-paths", "overview-preview", "overview-preview-metrics", "overview-distribution-donut", "overview-collection-bars", "collection-guide", "catalog-branch-select", "catalog-topic-select", "metadata-filters", "metadata-filter-grid", "empty-suggestions"]) {
  if (!homeHtml.includes(`id="${marker}"`)) throw new Error(`The homepage overview is missing #${marker}.`);
}
const homeApp = await readFile(path.join(output, "app.js"), "utf8");
if (!homeApp.includes("conic-gradient(from -90deg") || !homeApp.includes('class="overview-bar-row"')) throw new Error("The homepage overview charts are not rendered.");
if (!homeApp.includes('class="collection-path"') || !homeApp.includes("renderCollectionGuide") || !homeApp.includes("updateTaxonomyControls")) throw new Error("The homepage collection navigation is incomplete.");
if (!homeApp.includes('class="resource-labels"')) throw new Error("Structured resource access labels are not rendered.");
if (!homeApp.includes("migrateFavoriteTokens") || !homeApp.includes("matchesMetadataFacets") || !homeApp.includes('class="resource-provenance"')) throw new Error("Stable favorites, metadata facets, or resource provenance are not rendered.");

const styles = await readFile(path.join(output, "styles.css"), "utf8");
if (!styles.includes(".resource-card h3 a:focus-visible::after") || !styles.includes("outline: 3px solid var(--cyan)")) throw new Error("Primary resource-card links have no visible focus-ring contract.");
for (const contract of [".need-paths", ".collection-guide", ".catalog-taxonomy-controls", ".metadata-filter-grid", ".resource-provenance", ".resource-grid.is-text", "@media print", "gap: 15px"]) {
  if (!styles.includes(contract)) throw new Error(`The need-first, guide, or spacious-card visual contract is missing: ${contract}`);
}
const activeSearch = await readFile(path.join(output, "search/weighted-lexical-v2.js"), "utf8");
if (!activeSearch.includes('SEARCH_ALGORITHM_ID = "weighted-lexical-v2"') || !activeSearch.includes("normalize(\"NFKD\")") || !activeSearch.includes("SEARCH_CONCEPTS")) throw new Error("The weighted lexical search contract is incomplete.");
for (const fileName of ["app.js", "dashboard.js", "atlas.js"]) {
  const javascript = await readFile(path.join(output, fileName), "utf8");
  if (!javascript.includes("runtime.theme.light") || !javascript.includes("runtime.theme.dark")) throw new Error(`Theme-toggle labels are not localized in ${fileName}.`);
  if (!javascript.includes("new URL(\"./data/")) throw new Error(`Data requests are not module-relative in ${fileName}.`);
}

const i18nRuntime = await readFile(path.join(output, "i18n.js"), "utf8");
if (!i18nRuntime.includes("Intl.NumberFormat") || !i18nRuntime.includes("Intl.PluralRules") || !i18nRuntime.includes("fallbackMessages")) throw new Error("The locale runtime is missing formatting or fallback support.");
try {
  await access(path.join(output, "ru", "data"));
  throw new Error("Localized routes must not duplicate generated catalog data.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const catalogIds = new Set(catalog.resources.map((resource) => resource.id));
for (const resource of atlas.resources.filter((candidate) => candidate.catalogReference)) {
  if (!resource.atlasSource || resource.idOrigin !== "explicit" || !catalogIds.has(resource.id)) throw new Error(`Broken atlas catalog reference: ${resource.id}`);
}

console.log(`Verified ${catalog.resourceCount} resources across ${catalog.categories.length} collections and ${atlas.resourceCount} atlas resources.`);
