import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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
for (const relativePath of ["index.html", "dashboard.html", "atlas.html", "styles.css", "dashboard.css", "atlas.css", "app.js", "dashboard.js", "search.js", "search/and-substring-v1.js", "mind-map.js", "atlas.js", "assets/favicon.svg", "data/catalog.json", "data/overview.json", "data/funding.json", "data/atlas.json", "data/atlas-themes.json", "data/geometry/countries-110m.json", "data/geometry/states-albers-10m.json", ".nojekyll"]) {
  await access(path.join(output, relativePath));
}

const atlas = JSON.parse(await readFile(path.join(output, "data/atlas.json"), "utf8"));
if (atlas.schemaVersion !== 1) throw new Error("Unsupported atlas schema.");
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
  if (!resource.title || !resource.description || !resource.domain || !resource.section || !resource.locationId || !resource.source) throw new Error(`Incomplete atlas resource: ${resource.url}`);
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
  }
}

const urls = catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/\/$/, ""));
if (new Set(urls).size !== urls.length) throw new Error("The catalog contains duplicate normalized URLs.");
for (const resource of catalog.resources) {
  if (!resource.title || !resource.description || !resource.category || !resource.section || !resource.source || resource.groupSlug === undefined) throw new Error(`Incomplete resource: ${resource.url}`);
  new URL(resource.url);
}

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
for (const fileName of ["index.html", "dashboard.html", "atlas.html"]) {
  const html = await readFile(path.join(output, fileName), "utf8");
  if (html.includes("<!-- akashic-funding-badges -->")) throw new Error(`Funding badges were not generated in ${fileName}.`);
  for (const source of funding.sources) {
    if (!html.includes(`href="${escapeHtml(source.url)}"`)) throw new Error(`Funding source ${source.label} is missing from ${fileName}.`);
  }
}

const catalogUrls = new Set(catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "")));
for (const resource of atlas.resources.filter((candidate) => candidate.catalogReference)) {
  const normalizedUrl = resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
  if (!resource.atlasSource || !catalogUrls.has(normalizedUrl)) throw new Error(`Broken atlas catalog reference: ${resource.url}`);
}

console.log(`Verified ${catalog.resourceCount} resources across ${catalog.categories.length} collections and ${atlas.resourceCount} atlas resources.`);
