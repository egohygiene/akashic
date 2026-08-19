import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const output = path.join(process.cwd(), "dist");
for (const relativePath of ["index.html", "atlas.html", "styles.css", "atlas.css", "app.js", "search.js", "search/and-substring-v1.js", "mind-map.js", "atlas.js", "assets/favicon.svg", "data/catalog.json", "data/atlas.json", "data/atlas-themes.json", "data/geometry/countries-110m.json", "data/geometry/states-albers-10m.json", ".nojekyll"]) {
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

const catalogUrls = new Set(catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "")));
for (const resource of atlas.resources.filter((candidate) => candidate.catalogReference)) {
  const normalizedUrl = resource.url.toLocaleLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
  if (!resource.atlasSource || !catalogUrls.has(normalizedUrl)) throw new Error(`Broken atlas catalog reference: ${resource.url}`);
}

console.log(`Verified ${catalog.resourceCount} resources across ${catalog.categories.length} collections and ${atlas.resourceCount} atlas resources.`);
