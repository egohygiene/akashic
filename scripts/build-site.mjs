import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { normalizeUrl, parseResourceEntry, parseRootCategories } from "./lib/catalog.mjs";
import { validateAtlasHierarchy } from "./lib/atlas.mjs";
import { parseRelatedPaths, parseSiteGuide } from "./lib/guide.mjs";
import { loadLocales, localizeHtml } from "./lib/i18n.mjs";

const root = process.cwd();
const sourceDirectory = path.join(root, "site");
const outputDirectory = path.join(root, "dist");
const listsDirectory = path.join(root, "lists");
const atlasDirectory = path.join(root, "atlas");
const fundingFile = path.join(root, ".github", "FUNDING.yml");
const ROOT_GROUP_SLUG = "__root__";
const ATLAS_ROLES = new Set(["resource", "index"]);
const FUNDING_PLACEHOLDER = "<!-- akashic-funding-badges -->";

const FUNDING_PLATFORMS = {
  buy_me_a_coffee: { label: "Buy Me a Coffee", glyph: "☕", url: (value) => `https://www.buymeacoffee.com/${encodeURIComponent(value)}` },
  community_bridge: { label: "Community Bridge", glyph: "◇", url: (value) => `https://funding.communitybridge.org/projects/${encodeURIComponent(value)}` },
  custom: { label: "Support", glyph: "♥", url: (value) => value },
  github: { label: "GitHub Sponsors", glyph: "♥", url: (value) => `https://github.com/sponsors/${encodeURIComponent(value)}` },
  issuehunt: { label: "IssueHunt", glyph: "⌁", url: (value) => `https://issuehunt.io/r/${encodeURIComponent(value)}` },
  ko_fi: { label: "Ko-fi", glyph: "☕", url: (value) => `https://ko-fi.com/${encodeURIComponent(value)}` },
  lfx_crowdfunding: { label: "LFX Crowdfunding", glyph: "∞", url: (value) => `https://crowdfunding.lfx.linuxfoundation.org/projects/${encodeURIComponent(value)}` },
  liberapay: { label: "Liberapay", glyph: "✦", url: (value) => `https://liberapay.com/${encodeURIComponent(value)}` },
  open_collective: { label: "Open Collective", glyph: "◎", url: (value) => `https://opencollective.com/${encodeURIComponent(value)}` },
  otechie: { label: "Otechie", glyph: "⌘", url: (value) => `https://otechie.com/${encodeURIComponent(value)}` },
  patreon: { label: "Patreon", glyph: "✦", url: (value) => `https://www.patreon.com/${encodeURIComponent(value)}` },
  polar: { label: "Polar", glyph: "◐", url: (value) => `https://polar.sh/${encodeURIComponent(value)}` },
  thanks_dev: { label: "thanks.dev", glyph: "♥", url: (value) => `https://thanks.dev/${value.split("/").map(encodeURIComponent).join("/")}` },
  tidelift: { label: "Tidelift", glyph: "△", url: (value) => `https://tidelift.com/subscription/pkg/${value.split("/").map(encodeURIComponent).join("/")}` },
};

const parseAdvisory = (markdown) => markdown.match(/^<!-- site-advisory: (.+) -->$/m)?.[1].trim() || "";
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const headingSlug = (value) => value.toLocaleLowerCase("en-US").replace(/[^\p{Letter}\p{Number}\s-]/gu, "").trim().replace(/\s+/g, "-");

function parseFundingValues(value) {
  const normalized = value.trim();
  const values = normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1).split(",")
    : [normalized];
  return values.map((item) => item.trim().replace(/^(['"])(.*)\1$/, "$2")).filter(Boolean);
}

function buildFunding(markdown) {
  const sources = [];
  for (const line of markdown.split("\n")) {
    const entry = line.match(/^([a-z_]+):\s*(.+?)\s*$/);
    if (!entry) continue;
    const platform = FUNDING_PLATFORMS[entry[1]];
    if (!platform) throw new Error(`Unsupported funding platform: ${entry[1]}`);
    for (const value of parseFundingValues(entry[2])) {
      const url = platform.url(value);
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") throw new Error(`Funding URLs must use HTTPS: ${url}`);
      const label = entry[1] === "custom" ? parsedUrl.hostname.replace(/^www\./, "") : platform.label;
      sources.push({ platform: entry[1], value, label, glyph: platform.glyph, url });
    }
  }
  if (!sources.length) throw new Error("The funding configuration has no active sources.");
  return { sources };
}

function interpolate(message, values) {
  return message.replace(/\{([a-z][a-z0-9]*)\}/gi, (_, key) => Object.hasOwn(values, key) ? String(values[key]) : `{${key}}`);
}

function fundingMarkup(funding, messages) {
  return funding.sources.map((source) => `<a class="funding-badge funding-badge-${escapeHtml(source.platform)}" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(interpolate(messages["runtime.funding.aria"], { label: source.label }))}"><span aria-hidden="true">${escapeHtml(source.glyph)}</span><strong>${escapeHtml(source.label)}</strong><b aria-hidden="true">↗</b></a>`).join("");
}

async function buildLocalizedPages(locales, funding) {
  const pages = ["index.html", "dashboard.html", "atlas.html"];
  for (const locale of locales.locales) {
    const localeDirectory = locale.code === locales.defaultLocale ? outputDirectory : path.join(outputDirectory, locale.route.replace(/^\//, ""));
    await mkdir(localeDirectory, { recursive: true });
    const messages = locales.catalogs.get(locale.code);
    for (const page of pages) {
      const sourceHtml = await readFile(path.join(sourceDirectory, page), "utf8");
      const localized = localizeHtml(sourceHtml, locale, page, locales).replace(FUNDING_PLACEHOLDER, fundingMarkup(funding, messages));
      if (localized.includes(FUNDING_PLACEHOLDER)) throw new Error(`Funding badges were not generated for ${locale.code}/${page}.`);
      await writeFile(path.join(localeDirectory, page), localized);
    }
  }
}

async function findReadmes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findReadmes(entryPath);
    return entry.isFile() && entry.name === "README.md" ? [entryPath] : [];
  }));
  return files.flat();
}

function parseResources(markdown, category, filePath) {
  let section = category.title;
  const resources = [];
  const relativeParts = path.relative(listsDirectory, filePath).split(path.sep);
  const nested = relativeParts.length > 2;
  const groupSlug = nested ? relativeParts.at(-2) : ROOT_GROUP_SLUG;
  const heading = markdown.match(/^#\s+(.+?)(?:\s+\[!\[|$)/m)?.[1]?.trim() || category.title;
  const groupTitle = nested ? heading.replace(/^Awesome\s+/i, "") : category.title;
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading && heading[1] !== "Contents") section = heading[1].trim();
    const entry = parseResourceEntry(line, { extractLeadingLabels: groupSlug === "creative-tools-and-production" });
    if (!entry) continue;
    let domain = "web";
    try { domain = new URL(entry.url).hostname.replace(/^www\./, ""); } catch {}
    resources.push({
      ...entry,
      domain,
      category: category.title,
      categorySlug: category.slug,
      section,
      groupSlug,
      groupTitle,
      source: path.relative(root, filePath).split(path.sep).join("/"),
    });
  }
  return resources;
}

function parseAtlasPlace(markdown, filePath) {
  const locationId = markdown.match(/^<!-- atlas-location: ([a-z0-9-]+) -->$/m)?.[1];
  if (!locationId) throw new Error(`Atlas place is missing atlas-location metadata: ${path.relative(root, filePath)}`);
  let section = "Local resources";
  const resources = [];
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) section = heading[1].trim();
    const entry = line.match(/^- \[([^\]]+)]\((https?:\/\/[^)]+)\) - (.+)$/);
    if (!entry) continue;
    const url = entry[2].trim();
    const roleMatch = entry[3].match(/\s*<!--\s*atlas-role:\s*([a-z-]+)\s*-->\s*$/);
    const role = roleMatch?.[1] || "resource";
    if (!ATLAS_ROLES.has(role)) throw new Error(`Unsupported atlas role ${role} in ${path.relative(root, filePath)}.`);
    resources.push({
      title: entry[1].trim(),
      url,
      description: roleMatch ? entry[3].slice(0, roleMatch.index).trim() : entry[3].trim(),
      domain: new URL(url).hostname.replace(/^www\./, ""),
      section,
      role,
      locationId,
      source: path.relative(root, filePath).split(path.sep).join("/"),
    });
  }
  return { locationId, resources };
}

async function buildAtlas(catalogResources) {
  const hierarchy = JSON.parse(await readFile(path.join(atlasDirectory, "locations.json"), "utf8"));
  const locationById = validateAtlasHierarchy(hierarchy);

  const placeDirectory = path.join(atlasDirectory, "places");
  const placeFiles = (await readdir(placeDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(placeDirectory, entry.name))
    .sort();
  const resources = [];
  const coveredLocations = new Set();
  for (const filePath of placeFiles) {
    const place = parseAtlasPlace(await readFile(filePath, "utf8"), filePath);
    if (!locationById.has(place.locationId)) throw new Error(`Atlas place references unknown location: ${place.locationId}`);
    if (coveredLocations.has(place.locationId)) throw new Error(`Multiple atlas files cover ${place.locationId}.`);
    coveredLocations.add(place.locationId);
    resources.push(...place.resources);
  }

  const seen = new Set();
  for (const resource of resources) {
    const key = normalizeUrl(resource.url);
    if (seen.has(key)) throw new Error(`Duplicate atlas URL: ${resource.url}`);
    seen.add(key);
  }
  const catalogUrls = new Set(catalogResources.map((resource) => normalizeUrl(resource.url)));
  const duplicatedCatalogUrl = resources.find((resource) => catalogUrls.has(normalizeUrl(resource.url)));
  if (duplicatedCatalogUrl) throw new Error(`Atlas resource already belongs in the main catalog; reference it from atlas/locations.json instead: ${duplicatedCatalogUrl.url}`);

  const catalogResourceByUrl = new Map(catalogResources.map((resource) => [normalizeUrl(resource.url), resource]));
  for (const location of hierarchy.locations) {
    if (location.catalogResources !== undefined && !Array.isArray(location.catalogResources)) throw new Error(`Atlas catalogResources must be an array for ${location.id}.`);
    for (const reference of location.catalogResources || []) {
      if (!reference?.url || !reference?.section) throw new Error(`Incomplete atlas catalog reference for ${location.id}.`);
      if (reference.role && !ATLAS_ROLES.has(reference.role)) throw new Error(`Unsupported atlas catalog reference role ${reference.role} for ${location.id}.`);
      const key = normalizeUrl(reference.url);
      if (seen.has(key)) throw new Error(`Duplicate atlas resource reference: ${reference.url}`);
      const catalogResource = catalogResourceByUrl.get(key);
      if (!catalogResource) throw new Error(`Atlas catalog reference does not exist in the main catalog: ${reference.url}`);
      resources.push({
        title: catalogResource.title,
        url: catalogResource.url,
        description: catalogResource.description,
        domain: catalogResource.domain,
        section: reference.section,
        role: reference.role || "resource",
        locationId: location.id,
        source: catalogResource.source,
        atlasSource: "atlas/locations.json",
        catalogReference: true,
      });
      seen.add(key);
      coveredLocations.add(location.id);
    }
  }

  const coverageCache = new Map();
  const isCovered = (location) => {
    if (coverageCache.has(location.id)) return coverageCache.get(location.id);
    const covered = coveredLocations.has(location.id) || location.children.some((childId) => isCovered(locationById.get(childId)));
    coverageCache.set(location.id, covered);
    return covered;
  };
  for (const location of hierarchy.locations) {
    location.resourceCount = resources.filter((resource) => resource.locationId === location.id).length;
    location.covered = isCovered(location);
  }
  return {
    schemaVersion: hierarchy.schemaVersion,
    rootId: hierarchy.rootId,
    locationCount: hierarchy.locations.length,
    resourceCount: resources.length,
    locations: hierarchy.locations,
    resources,
  };
}

function rankedCounts(values, limit = Infinity) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
}

function buildOverview(catalog) {
  const categories = catalog.categories.map((category) => {
    const resources = catalog.resources.filter((resource) => resource.categorySlug === category.slug);
    return {
      title: category.title,
      slug: category.slug,
      description: category.description,
      color: category.color,
      glyph: category.glyph,
      count: category.count,
      sourceFileCount: new Set(resources.map((resource) => resource.source)).size,
      topicPathCount: category.groups.reduce((sum, group) => sum + group.sections.length, 0),
      uniqueDomainCount: new Set(resources.map((resource) => resource.domain)).size,
      topDomains: rankedCounts(resources.map((resource) => resource.domain), 5).map(({ name, count }) => ({ domain: name, count })),
      groups: category.groups,
    };
  });
  const topicPaths = categories.flatMap((category) => category.groups.flatMap((group) => group.sections.map((section) => ({
    title: section.title,
    count: section.count,
    categoryTitle: category.title,
    categorySlug: category.slug,
    categoryColor: category.color,
    categoryGlyph: category.glyph,
    groupTitle: group.title,
    groupSlug: group.slug,
  }))));
  const sourceFiles = new Set(catalog.resources.map((resource) => resource.source));
  const uniqueDomains = new Set(catalog.resources.map((resource) => resource.domain));
  return {
    schemaVersion: 1,
    resourceCount: catalog.resourceCount,
    collectionCount: categories.length,
    sourceFileCount: sourceFiles.size,
    topicPathCount: topicPaths.length,
    uniqueDomainCount: uniqueDomains.size,
    categories,
    topDomains: rankedCounts(catalog.resources.map((resource) => resource.domain), 12).map(({ name, count }) => ({ domain: name, count })),
    topPaths: topicPaths.sort((left, right) => right.count - left.count || left.categoryTitle.localeCompare(right.categoryTitle) || left.title.localeCompare(right.title)).slice(0, 12),
  };
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
    if (relative === path.join(categorySlug, "README.md")) {
      category.advisory = parseAdvisory(markdown);
      category.guide = parseSiteGuide(markdown, path.relative(root, filePath).split(path.sep).join("/"));
      category.relatedPaths = parseRelatedPaths(markdown, path.relative(root, filePath).split(path.sep).join("/"));
    }
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
    const groupMap = new Map();
    for (const resource of categoryResources) {
      const key = resource.groupSlug || category.slug;
      if (!groupMap.has(key)) groupMap.set(key, { slug: resource.groupSlug, title: resource.groupTitle, count: 0, sections: new Map(), sources: new Set() });
      const group = groupMap.get(key);
      group.count += 1;
      group.sections.set(resource.section, (group.sections.get(resource.section) || 0) + 1);
      group.sources.add(resource.source);
    }
    category.groups = [...groupMap.values()].map((group) => ({
      slug: group.slug,
      title: group.title,
      count: group.count,
      source: group.sources.size === 1 ? [...group.sources][0] : category.path,
      sections: [...group.sections].map(([title, count]) => ({ title, count })),
    }));
    if (category.groups.length === 1 && category.groups[0].slug === ROOT_GROUP_SLUG) {
      category.groups[0].slug = "";
      for (const resource of categoryResources) resource.groupSlug = "";
    }
  }
  for (const category of categories) {
    category.relatedPaths = (category.relatedPaths || []).map((related) => {
      const relatedCategory = categoryBySlug.get(related.categorySlug);
      const relatedGroup = relatedCategory?.groups?.find((group) => group.slug === related.groupSlug)
        || (relatedCategory?.groups?.length === 1 ? relatedCategory.groups[0] : null);
      const section = related.sectionHash
        ? relatedGroup?.sections.find((candidate) => headingSlug(candidate.title) === related.sectionHash)?.title || ""
        : "";
      return relatedCategory ? { title: related.title, categorySlug: related.categorySlug, groupSlug: relatedGroup?.slug || "", section } : null;
    }).filter(Boolean);
  }

  const catalog = {
    resourceCount: uniqueResources.length,
    categories,
    resources: uniqueResources,
  };
  const atlas = await buildAtlas(uniqueResources);
  const overview = buildOverview(catalog);
  const funding = buildFunding(await readFile(fundingFile, "utf8"));
  const locales = await loadLocales(sourceDirectory);

  await rm(outputDirectory, { recursive: true, force: true });
  await cp(sourceDirectory, outputDirectory, { recursive: true });
  await mkdir(path.join(outputDirectory, "data"), { recursive: true });
  await writeFile(path.join(outputDirectory, "data", "catalog.json"), `${JSON.stringify(catalog)}\n`);
  await writeFile(path.join(outputDirectory, "data", "atlas.json"), `${JSON.stringify(atlas)}\n`);
  await writeFile(path.join(outputDirectory, "data", "overview.json"), `${JSON.stringify(overview)}\n`);
  await writeFile(path.join(outputDirectory, "data", "funding.json"), `${JSON.stringify({ schemaVersion: 1, sources: funding.sources })}\n`);
  await buildLocalizedPages(locales, funding);
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");
  console.log(`Built ${catalog.resourceCount} resources across ${categories.length} collections, ${overview.topicPathCount} topic paths, and ${atlas.resourceCount} place-aware atlas resources.`);
}

await build();
