import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const output = path.join(process.cwd(), "dist");
for (const relativePath of ["index.html", "styles.css", "app.js", "mind-map.js", "assets/favicon.svg", "data/catalog.json", ".nojekyll"]) {
  await access(path.join(output, relativePath));
}

const catalog = JSON.parse(await readFile(path.join(output, "data/catalog.json"), "utf8"));
if (!Array.isArray(catalog.categories) || catalog.categories.length < 1) throw new Error("The catalog has no categories.");
if (!Array.isArray(catalog.resources) || catalog.resources.length < 1) throw new Error("The catalog has no resources.");
if (catalog.resourceCount !== catalog.resources.length) throw new Error("The catalog resource count is inconsistent.");
for (const category of catalog.categories) {
  if (!Array.isArray(category.sections) || category.sections.length < 1) throw new Error(`Collection has no mind-map topics: ${category.title}`);
  const categoryResources = catalog.resources.filter((resource) => resource.categorySlug === category.slug);
  if (categoryResources.length !== category.count) throw new Error(`Collection count is inconsistent for ${category.title}.`);
  const expectedSections = new Map();
  for (const resource of categoryResources) expectedSections.set(resource.section, (expectedSections.get(resource.section) || 0) + 1);
  if (expectedSections.size !== category.sections.length) throw new Error(`Mind-map topic list is inconsistent for ${category.title}.`);
  for (const section of category.sections) {
    if (expectedSections.get(section.title) !== section.count) throw new Error(`Mind-map topic count is inconsistent for ${category.title} / ${section.title}.`);
  }
}

const urls = catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/\/$/, ""));
if (new Set(urls).size !== urls.length) throw new Error("The catalog contains duplicate normalized URLs.");
for (const resource of catalog.resources) {
  if (!resource.title || !resource.description || !resource.category || !resource.section) throw new Error(`Incomplete resource: ${resource.url}`);
  new URL(resource.url);
}

console.log(`Verified ${catalog.resourceCount} resources across ${catalog.categories.length} collections.`);
