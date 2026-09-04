import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ATLAS_LOCATION_SCHEMA_VERSION, deriveAtlasLocationResources } from "./lib/atlas.mjs";
import { loadLocales, localePagePath } from "./lib/i18n.mjs";
import { validateResourceIdentities, validateResourceMetadata } from "./lib/resource-metadata.mjs";
import { loadEvaluationFixture } from "./lib/search-evaluation.mjs";

const root = process.cwd();
const output = path.join(root, "dist");
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const rankedCounts = (values, limit = Infinity) => {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
};
for (const relativePath of ["index.html", "dashboard.html", "atlas.html", "search-lab.html", "ru/index.html", "ru/dashboard.html", "ru/atlas.html", "styles.css", "dashboard.css", "atlas.css", "search-lab.css", "app.js", "favorites.js", "catalog-metadata.js", "dashboard.js", "needs.js", "search.js", "search-query-state.js", "search-lab.js", "search-lab-metrics.js", "search/and-substring-v1.js", "search/concepts-v1.js", "search/weighted-lexical-v2.js", "mind-map.js", "atlas.js", "atlas-renderers.js", "i18n.js", "i18n/locales.json", "i18n/en.json", "i18n/ru.json", "assets/favicon.svg", "data/catalog.json", "data/overview.json", "data/funding.json", "data/search-evaluation-v2.json", "data/atlas.json", "data/atlas-themes.json", "data/geometry/countries-110m.json", "data/geometry/states-albers-10m.json", ".nojekyll"]) {
  await access(path.join(output, relativePath));
}

const atlas = JSON.parse(await readFile(path.join(output, "data/atlas.json"), "utf8"));
if (atlas.schemaVersion !== ATLAS_LOCATION_SCHEMA_VERSION) throw new Error("Unsupported atlas schema.");
if (atlas.applicabilitySchemaVersion !== 2) throw new Error("Unsupported atlas applicability schema.");
if (!Array.isArray(atlas.locations) || atlas.locations.length !== atlas.locationCount) throw new Error("The atlas location count is inconsistent.");
if (!Array.isArray(atlas.resources) || atlas.resources.length !== atlas.resourceCount) throw new Error("The atlas resource count is inconsistent.");
if (!Array.isArray(atlas.inheritance) || !atlas.resourcesByLocation || Array.isArray(atlas.resourcesByLocation)) throw new Error("The atlas derived applicability data is incomplete.");
if (atlas.associationCount !== atlas.resources.length) throw new Error("The atlas association count is inconsistent.");
if (!Number.isInteger(atlas.locationSourceCount) || atlas.locationSourceCount < 1) throw new Error("The atlas location-source count is invalid.");
if (!Array.isArray(atlas.identifierRegistries) || atlas.identifierRegistries.length < 1) throw new Error("The atlas identifier registry summary is incomplete.");
const countryRegistry = atlas.identifierRegistries.find((registry) => registry.kind === "countries");
if (countryRegistry?.id !== "countries" || countryRegistry.countryCount !== 1 || new URL(countryRegistry.sourceUrl).hostname !== "www.iso.org" || !/^\d{4}-\d{2}-\d{2}$/.test(countryRegistry.sourceRetrieved)) throw new Error("The Atlas country registry summary is inconsistent.");
const subdivisionRegistry = atlas.identifierRegistries.find((registry) => registry.id === "us-subdivisions");
if (!subdivisionRegistry) throw new Error("The U.S. subdivision registry summary is missing.");
if (subdivisionRegistry.kind !== "subdivisions" || subdivisionRegistry.countryId !== "us" || subdivisionRegistry.subdivisionCount !== 57 || subdivisionRegistry.mappedGeometryCount !== 51) throw new Error("The U.S. subdivision registry summary is inconsistent.");
if (JSON.stringify(subdivisionRegistry.subdivisionTypeCounts) !== JSON.stringify({ district: 1, state: 50, territory: 5, "territory-group": 1 })) throw new Error("The U.S. subdivision type counts are inconsistent.");
if (new URL(subdivisionRegistry.sourceUrl).hostname !== "www.census.gov" || !/^\d{4}-\d{2}-\d{2}$/.test(subdivisionRegistry.sourceRetrieved)) throw new Error("The U.S. subdivision registry provenance is incomplete.");
const locations = new Map(atlas.locations.map((location) => [location.id, location]));
if (!locations.has(atlas.rootId)) throw new Error("The atlas root location is missing.");
if (Object.keys(atlas.resourcesByLocation).length !== locations.size) throw new Error("The atlas location-resource map is inconsistent.");
const atlasLocationSources = new Set(atlas.locations.map((location) => location.source));
if (atlasLocationSources.size !== atlas.locationSourceCount || locations.get("world")?.source !== "atlas/locations.json" || atlas.locations.some((location) => !/^atlas\/locations(?:\/[a-z0-9-]+)?\.json$/.test(location.source || ""))) throw new Error("The atlas location source provenance is inconsistent.");
if (["us", "us-ca", "us-ma", "us-ma-wilmington"].some((locationId) => locations.get(locationId)?.source !== "atlas/locations/us.json")) throw new Error("The United States location source is incomplete.");
if (JSON.stringify(locations.get("us")?.identifiers) !== JSON.stringify({ isoAlpha2: "US", isoNumeric: "840" })) throw new Error("The United States identifiers are inconsistent.");
if (JSON.stringify(locations.get("us-ca")?.identifiers) !== JSON.stringify({ registry: "us-subdivisions", subdivisionType: "state", postalCode: "CA", censusFips: "06" })) throw new Error("The California identifiers are inconsistent.");
if (JSON.stringify(locations.get("us-ma")?.identifiers) !== JSON.stringify({ registry: "us-subdivisions", subdivisionType: "state", postalCode: "MA", censusFips: "25" })) throw new Error("The Massachusetts identifiers are inconsistent.");
for (const location of atlas.locations) {
  if (!location.id || !location.name || !location.kind || !location.geometry || !Array.isArray(location.children)) throw new Error(`Incomplete atlas location: ${location.id || "unknown"}`);
  if (Object.hasOwn(location, "camera")) throw new Error(`Obsolete atlas camera metadata remains for ${location.id}.`);
  if (location.geometry.dataset === "point") {
    const validMapPosition = Array.isArray(location.geometry.mapPosition) && location.geometry.mapPosition.length === 2 && location.geometry.mapPosition.every((value) => Number.isFinite(value) && value >= 0 && value <= 1);
    if (!validMapPosition) throw new Error(`Invalid atlas point map position for ${location.id}.`);
  }
  if (location.parentId && !locations.has(location.parentId)) throw new Error(`Unknown atlas parent for ${location.id}.`);
  for (const childId of location.children) {
    if (locations.get(childId)?.parentId !== location.id) throw new Error(`Broken atlas hierarchy at ${location.id} / ${childId}.`);
  }
  const expectedLegacyReferences = atlas.resources
    .filter((resource) => resource.locationId === location.id && resource.catalogReference)
    .map((resource) => ({ resourceId: resource.id, section: resource.section, ...(resource.role !== "resource" ? { role: resource.role } : {}) }));
  if (JSON.stringify(location.catalogResources || []) !== JSON.stringify(expectedLegacyReferences)) throw new Error(`Atlas compatibility references are inconsistent for ${location.name}.`);
  const exactCount = atlas.resources.filter((resource) => resource.locationId === location.id).length;
  if (exactCount !== location.resourceCount) throw new Error(`Atlas resource count is inconsistent for ${location.name}.`);
  const placements = atlas.resourcesByLocation[location.id];
  if (!Array.isArray(placements) || placements.length !== location.availableResourceCount) throw new Error(`Atlas available-resource count is inconsistent for ${location.name}.`);
  if (placements.filter((placement) => placement.relationship === "inherited").length !== location.inheritedResourceCount) throw new Error(`Atlas inherited-resource count is inconsistent for ${location.name}.`);
}
const atlasInheritanceKeys = new Set();
for (const edge of atlas.inheritance) {
  if (!edge.locationId || !edge.inheritsFromLocationId || !edge.provenanceId || !locations.has(edge.locationId) || !locations.has(edge.inheritsFromLocationId) || edge.locationId === edge.inheritsFromLocationId) throw new Error("The atlas contains an invalid inheritance edge.");
  if (edge.id !== `${edge.locationId}:${edge.inheritsFromLocationId}`) throw new Error(`Invalid atlas inheritance identity: ${edge.id || "missing"}`);
  const inheritanceKey = `${edge.locationId}\u0000${edge.inheritsFromLocationId}`;
  if (atlasInheritanceKeys.has(inheritanceKey)) throw new Error(`Duplicate atlas inheritance edge: ${edge.locationId} / ${edge.inheritsFromLocationId}`);
  atlasInheritanceKeys.add(inheritanceKey);
  if (!["human-review", "migration"].includes(edge.provenance?.kind)) throw new Error(`Unsupported atlas inheritance provenance: ${edge.locationId}`);
}
const atlasAssociationIds = new Set();
const atlasResourceIds = new Set();
const atlasIdentityByUrl = new Map();
const atlasUrlByResourceId = new Map();
for (const resource of atlas.resources) {
  if (!resource.id || !resource.associationId || !resource.title || !resource.description || !resource.domain || !resource.section || !resource.locationId || !resource.source) throw new Error(`Incomplete atlas resource: ${resource.url}`);
  if (resource.associationId !== `${resource.locationId}:${resource.id}`) throw new Error(`Invalid atlas association identity: ${resource.associationId}`);
  if (atlasAssociationIds.has(resource.associationId)) throw new Error(`Duplicate atlas association: ${resource.associationId}`);
  atlasAssociationIds.add(resource.associationId);
  atlasResourceIds.add(resource.id);
  if (!["resource", "index"].includes(resource.role)) throw new Error(`Unsupported atlas role: ${resource.role}`);
  if (!["specific", "cross-associated"].includes(resource.relationship)) throw new Error(`Unsupported atlas relationship: ${resource.relationship}`);
  if (!["human-review", "migration", "place-file"].includes(resource.provenance?.kind)) throw new Error(`Unsupported atlas provenance: ${resource.associationId}`);
  if (["migration", "place-file"].includes(resource.provenance.kind) && !resource.provenance.source) throw new Error(`Incomplete atlas source provenance: ${resource.associationId}`);
  if (resource.provenance.kind === "human-review" && (!resource.provenance.sourceUrl || !resource.provenance.reviewed || !resource.provenance.reviewedBy)) throw new Error(`Incomplete atlas human-review provenance: ${resource.associationId}`);
  if (!locations.has(resource.locationId)) throw new Error(`Atlas resource has unknown location: ${resource.url}`);
  new URL(resource.url);
  const normalizedUrl = resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
  if (atlasIdentityByUrl.has(normalizedUrl) && atlasIdentityByUrl.get(normalizedUrl) !== resource.id) throw new Error(`Atlas URL has conflicting resource IDs: ${resource.url}`);
  atlasIdentityByUrl.set(normalizedUrl, resource.id);
  if (atlasUrlByResourceId.has(resource.id) && atlasUrlByResourceId.get(resource.id) !== normalizedUrl) throw new Error(`Atlas resource ID has conflicting URLs: ${resource.id}`);
  atlasUrlByResourceId.set(resource.id, normalizedUrl);
}
if (atlasAssociationIds.size !== atlas.associationCount) throw new Error("The atlas has duplicate association identities.");
if (atlasResourceIds.size !== atlas.uniqueResourceCount || atlasUrlByResourceId.size !== atlas.uniqueResourceCount) throw new Error("The atlas unique-resource count is inconsistent.");
const expectedResourcesByLocation = deriveAtlasLocationResources(atlas.locations, atlas.resources, atlas.inheritance);
if (JSON.stringify(atlas.resourcesByLocation) !== JSON.stringify(expectedResourcesByLocation)) throw new Error("The atlas precomputed location-resource map is inconsistent.");
const wilmingtonSourceOrder = [...new Set((atlas.resourcesByLocation["us-ma-wilmington"] || []).map((placement) => placement.sourceLocationId))];
if (JSON.stringify(wilmingtonSourceOrder) !== JSON.stringify(["us-ma-wilmington", "us-ma", "us"])) throw new Error("Wilmington resources must resolve local, Massachusetts, then United States scope.");

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
    if (!html.includes('href="/search-lab.html"')) throw new Error(`The browser Search Lab is not discoverable from ${relativePath}.`);
    for (const source of funding.sources) {
      if (!html.includes(`href="${escapeHtml(source.url)}"`)) throw new Error(`Funding source ${source.label} is missing from ${fileName}.`);
    }
  }
}

const atlasHtml = await readFile(path.join(output, "atlas.html"), "utf8");
for (const marker of ["atlas-scope-filter-label", "atlas-local-resource-count", "atlas-available-resource-count", "atlas-map-controls", "atlas-map-fallback", "atlas-place-directory", "atlas-place-directory-summary", "atlas-place-directory-list"]) {
  if (!atlasHtml.includes(`id="${marker}"`)) throw new Error(`The Atlas interface is missing #${marker}.`);
}
if (!atlasHtml.includes('data-atlas-scope="local"') || !atlasHtml.includes('data-atlas-scope="all"')) throw new Error("The Atlas local/all resource-scope choices are incomplete.");
if (!atlasHtml.includes('<ol class="atlas-place-directory-list"') || !atlasHtml.includes('href="#atlas-place-directory"')) throw new Error("The Atlas native place directory or map fallback is incomplete.");
const atlasScript = await readFile(path.join(output, "atlas.js"), "utf8");
if (!atlasScript.includes("resourcesByLocation") || !atlasScript.includes('url.searchParams.set("scope", "local")') || !atlasScript.includes("atlas-resource-provenance")) throw new Error("The Atlas inheritance, URL-state, or provenance rendering contract is incomplete.");
if (!atlasScript.includes("renderPlaceDirectory") || !atlasScript.includes("placeHref") || !atlasScript.includes('setAttribute("aria-current", "location")') || !atlasScript.includes("Promise.allSettled") || !atlasScript.includes("geometryReady") || !atlasScript.includes('svgElement("title", { id: "atlas-map-svg-title" })')) throw new Error("The Atlas place-directory or graceful map-failure contract is incomplete.");
const atlasRenderers = await readFile(path.join(output, "atlas-renderers.js"), "utf8");
if (!atlasScript.includes("rendererRegistry.resolve(location)") || atlasScript.includes("drawUnitedStates") || !atlasRenderers.includes("createAtlasRendererRegistry") || !atlasRenderers.includes("Duplicate Atlas renderer")) throw new Error("The Atlas dataset-and-level renderer registry is incomplete.");
const atlasStyles = await readFile(path.join(output, "atlas.css"), "utf8");
if (!atlasStyles.includes(".atlas-scope-filter") || !atlasStyles.includes(".atlas-resource-context") || !atlasStyles.includes(".atlas-resource-group.is-inherited")) throw new Error("The Atlas scope and provenance presentation contract is incomplete.");
if (!atlasStyles.includes(".atlas-map-fallback") || !atlasStyles.includes(".atlas-place-directory-list") || !atlasStyles.includes('[aria-current="location"]')) throw new Error("The Atlas place-directory or map-fallback presentation contract is incomplete.");

const homeHtml = await readFile(path.join(output, "index.html"), "utf8");
for (const marker of ["need-paths", "overview-preview", "overview-preview-metrics", "overview-distribution-donut", "overview-collection-bars", "collection-guide", "catalog-branch-select", "catalog-topic-select", "metadata-filters", "metadata-filter-grid", "empty-suggestions", "hero-search-privacy", "catalog-search-privacy"]) {
  if (!homeHtml.includes(`id="${marker}"`)) throw new Error(`The homepage overview is missing #${marker}.`);
}
if (homeHtml.includes('name="q"')) throw new Error("Search forms must not submit natural-language queries before the private runtime is ready.");
const homeApp = await readFile(path.join(output, "app.js"), "utf8");
if (!homeApp.includes("conic-gradient(from -90deg") || !homeApp.includes('class="overview-bar-row"')) throw new Error("The homepage overview charts are not rendered.");
if (!homeApp.includes('class="collection-path"') || !homeApp.includes("renderCollectionGuide") || !homeApp.includes("updateTaxonomyControls")) throw new Error("The homepage collection navigation is incomplete.");
if (!homeApp.includes('class="resource-labels"')) throw new Error("Structured resource access labels are not rendered.");
if (!homeApp.includes("migrateFavoriteTokens") || !homeApp.includes("matchesMetadataFacets") || !homeApp.includes('class="resource-provenance"')) throw new Error("Stable favorites, metadata facets, or resource provenance are not rendered.");
if (!homeApp.includes("createSearchShareUrl") || !homeApp.includes("readSharedSearchQuery") || !homeApp.includes("sharedSearchAnchor") || homeApp.includes('params.set("q", state.query)') || homeApp.includes("history.state.query")) throw new Error("Natural-language search is not private by default with explicit sharing.");
const searchQueryState = await readFile(path.join(output, "search-query-state.js"), "utf8");
if (!searchQueryState.includes("sharedUrl.searchParams.delete(\"q\")") || !searchQueryState.includes("new URLSearchParams({ q: normalizedQuery })")) throw new Error("Explicit search links do not keep the query in a fragment.");

const canonicalSearchEvaluation = await loadEvaluationFixture(path.join(root, "research/search/evaluations/natural-language-v2.json"));
const browserSearchEvaluation = JSON.parse(await readFile(path.join(output, "data/search-evaluation-v2.json"), "utf8"));
if (JSON.stringify(browserSearchEvaluation) !== JSON.stringify(canonicalSearchEvaluation)) throw new Error("The browser Search Lab fixture diverges from the canonical research fixture.");
if (browserSearchEvaluation.schemaVersion !== 2 || !browserSearchEvaluation.id || !Number.isInteger(browserSearchEvaluation.topK) || !Array.isArray(browserSearchEvaluation.cases) || browserSearchEvaluation.cases.length < 1) throw new Error("The browser Search Lab fixture is incomplete.");
const browserCaseIds = new Set();
for (const testCase of browserSearchEvaluation.cases) {
  if (!testCase.id || !testCase.query || browserCaseIds.has(testCase.id)) throw new Error("The browser Search Lab fixture contains an invalid or duplicate case.");
  browserCaseIds.add(testCase.id);
}

const searchLabHtml = await readFile(path.join(output, "search-lab.html"), "utf8");
for (const marker of ["search-lab", "measurement-passes", "run-search-lab", "search-lab-status", "lab-results", "download-search-report", "clear-search-report", "report-json"]) {
  if (!searchLabHtml.includes(`id="${marker}"`)) throw new Error(`The browser Search Lab is missing #${marker}.`);
}
if (!searchLabHtml.includes('type="module" src="search-lab.js"') || !searchLabHtml.includes("No typed questions") || !searchLabHtml.includes("No remote submission") || searchLabHtml.includes('name="q"')) throw new Error("The browser Search Lab privacy or module contract is incomplete.");
const searchLabScript = await readFile(path.join(output, "search-lab.js"), "utf8");
if (!searchLabScript.includes('new URL("./data/catalog.json", import.meta.url)') || !searchLabScript.includes('new URL("./data/search-evaluation-v2.json", import.meta.url)') || !searchLabScript.includes("PerformanceObserver.supportedEntryTypes") || !searchLabScript.includes("versioned-public-fixture-only") || !searchLabScript.includes("transmittedByLab: false") || searchLabScript.includes("sendBeacon") || searchLabScript.includes("XMLHttpRequest")) throw new Error("The browser Search Lab measurement or privacy boundary is incomplete.");

const styles = await readFile(path.join(output, "styles.css"), "utf8");
if (!styles.includes(".resource-card h3 a:focus-visible::after") || !styles.includes("outline: 3px solid var(--cyan)")) throw new Error("Primary resource-card links have no visible focus-ring contract.");
for (const contract of [".need-paths", ".collection-guide", ".catalog-taxonomy-controls", ".metadata-filter-grid", ".resource-provenance", ".resource-grid.is-text", "@media print", "gap: 15px"]) {
  if (!styles.includes(contract)) throw new Error(`The need-first, guide, or spacious-card visual contract is missing: ${contract}`);
}
const activeSearch = await readFile(path.join(output, "search/weighted-lexical-v2.js"), "utf8");
if (!activeSearch.includes('SEARCH_ALGORITHM_ID = "weighted-lexical-v2"') || !activeSearch.includes("normalize(\"NFKD\")") || !activeSearch.includes("SEARCH_CONCEPTS") || !activeSearch.includes("decomposeSearchQuery") || !activeSearch.includes("explainResourceMatch")) throw new Error("The weighted lexical search contract is incomplete.");
for (const fileName of ["app.js", "dashboard.js", "atlas.js"]) {
  const javascript = await readFile(path.join(output, fileName), "utf8");
  if (!javascript.includes("runtime.theme.light") || !javascript.includes("runtime.theme.dark")) throw new Error(`Theme-toggle labels are not localized in ${fileName}.`);
  if (!javascript.includes("new URL(\"./data/")) throw new Error(`Data requests are not module-relative in ${fileName}.`);
}

const i18nRuntime = await readFile(path.join(output, "i18n.js"), "utf8");
if (!i18nRuntime.includes("Intl.NumberFormat") || !i18nRuntime.includes("Intl.PluralRules") || !i18nRuntime.includes("fallbackMessages") || !i18nRuntime.includes('searchParameters.delete("q")')) throw new Error("The locale runtime is missing formatting, fallback, or private-query support.");
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
