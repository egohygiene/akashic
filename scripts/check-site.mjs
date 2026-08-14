import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const output = path.join(process.cwd(), "dist");
for (const relativePath of ["index.html", "styles.css", "app.js", "assets/favicon.svg", "data/catalog.json", ".nojekyll"]) {
  await access(path.join(output, relativePath));
}

const catalog = JSON.parse(await readFile(path.join(output, "data/catalog.json"), "utf8"));
if (!Array.isArray(catalog.categories) || catalog.categories.length < 1) throw new Error("The catalog has no categories.");
if (!Array.isArray(catalog.resources) || catalog.resources.length < 1) throw new Error("The catalog has no resources.");
if (catalog.resourceCount !== catalog.resources.length) throw new Error("The catalog resource count is inconsistent.");

const urls = catalog.resources.map((resource) => resource.url.toLocaleLowerCase().replace(/\/$/, ""));
if (new Set(urls).size !== urls.length) throw new Error("The catalog contains duplicate normalized URLs.");
for (const resource of catalog.resources) {
  if (!resource.title || !resource.description || !resource.category || !resource.section) throw new Error(`Incomplete resource: ${resource.url}`);
  new URL(resource.url);
}

console.log(`Verified ${catalog.resourceCount} resources across ${catalog.categories.length} collections.`);
