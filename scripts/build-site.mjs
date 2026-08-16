import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceDirectory = path.join(root, "site");
const outputDirectory = path.join(root, "dist");
const listsDirectory = path.join(root, "lists");

const slugify = (value) => value.toLocaleLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const parseAdvisory = (markdown) => markdown.match(/^<!-- site-advisory: (.+) -->$/m)?.[1].trim() || "";

async function findReadmes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findReadmes(entryPath);
    return entry.isFile() && entry.name === "README.md" ? [entryPath] : [];
  }));
  return files.flat();
}

function parseRootCategories(markdown) {
  const categoryPattern = /^- \[([^\]]+)]\((lists\/([^/]+)\/README\.md)\) - (.+?) \*\*(\d[\d,]*) resources\.\*\*$/gm;
  return [...markdown.matchAll(categoryPattern)].map((match) => ({
    title: match[1],
    path: match[2],
    slug: match[3],
    description: match[4],
    declaredCount: Number(match[5].replaceAll(",", "")),
  }));
}

function parseResources(markdown, category, filePath) {
  let section = category.title;
  const resources = [];
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading && heading[1] !== "Contents") section = heading[1].trim();
    const entry = line.match(/^- \[([^\]]+)]\((https?:\/\/[^)]+)\) - (.+)$/);
    if (!entry) continue;
    let domain = "web";
    try { domain = new URL(entry[2]).hostname.replace(/^www\./, ""); } catch {}
    resources.push({
      title: entry[1].trim(),
      url: entry[2].trim(),
      description: entry[3].trim(),
      domain,
      category: category.title,
      categorySlug: category.slug,
      section,
      source: path.relative(root, filePath).split(path.sep).join("/"),
    });
  }
  return resources;
}

async function build() {
  const rootReadme = await readFile(path.join(root, "README.md"), "utf8");
  const categories = parseRootCategories(rootReadme);
  if (!categories.length) throw new Error("No categories were found in the root README.");

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const readmes = (await findReadmes(listsDirectory)).sort();
  const resources = [];
  for (const filePath of readmes) {
    const relative = path.relative(listsDirectory, filePath);
    const categorySlug = relative.split(path.sep)[0];
    const category = categoryBySlug.get(categorySlug);
    if (!category) continue;
    const markdown = await readFile(filePath, "utf8");
    if (relative === path.join(categorySlug, "README.md")) category.advisory = parseAdvisory(markdown);
    resources.push(...parseResources(markdown, category, filePath));
  }

  const seen = new Set();
  const uniqueResources = resources.filter((resource) => {
    const key = resource.url.toLocaleLowerCase().replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (const category of categories) {
    category.advisory ||= "";
    const categoryResources = uniqueResources.filter((resource) => resource.categorySlug === category.slug);
    category.count = categoryResources.length;
    const sectionCounts = new Map();
    for (const resource of categoryResources) sectionCounts.set(resource.section, (sectionCounts.get(resource.section) || 0) + 1);
    category.sections = [...sectionCounts].map(([title, count]) => ({ title, count }));
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    resourceCount: uniqueResources.length,
    categories,
    resources: uniqueResources,
  };

  await rm(outputDirectory, { recursive: true, force: true });
  await cp(sourceDirectory, outputDirectory, { recursive: true });
  await mkdir(path.join(outputDirectory, "data"), { recursive: true });
  await writeFile(path.join(outputDirectory, "data", "catalog.json"), `${JSON.stringify(catalog)}\n`);
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");
  console.log(`Built ${catalog.resourceCount} resources across ${categories.length} collections.`);
}

await build();
