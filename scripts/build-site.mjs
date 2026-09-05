import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseRootCategories } from "./lib/catalog.mjs";
import { atlasTopologyGeometryIds, deriveAtlasLocationResources, mergeAtlasLocationSources, validateAtlasApplicability, validateAtlasCountryRegistry, validateAtlasHierarchy, validateAtlasSubdivisionRegistry } from "./lib/atlas.mjs";
import { validateAtlasJurisdictions } from "./lib/jurisdictions.mjs";
import { validateJurisdictionSourceCoverage } from "./lib/jurisdiction-sources.mjs";
import { parseRelatedPaths, parseSiteGuide } from "./lib/guide.mjs";
import { loadLocales, localizeHtml } from "./lib/i18n.mjs";
import { validateResourceIdentities } from "./lib/resource-metadata.mjs";
import { parseAtlasResourceEntry, parseResourceEntry } from "./lib/resource-parser.mjs";
import { loadEvaluationFixture } from "./lib/search-evaluation.mjs";
import { urlIdentity } from "./lib/url-identity.mjs";

const root = process.cwd();
const sourceDirectory = path.join(root, "site");
const outputDirectory = path.join(root, "dist");
const listsDirectory = path.join(root, "lists");
const atlasDirectory = path.join(root, "atlas");
const searchEvaluationFile = path.join(root, "research", "search", "evaluations", "natural-language-v2.json");
const fundingFile = path.join(root, ".github", "FUNDING.yml");
const ROOT_GROUP_SLUG = "__root__";
const ATLAS_SUBDIVISION_TYPES = ["district", "state", "territory", "territory-group"];
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
  for (const [lineIndex, line] of markdown.split("\n").entries()) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading && heading[1] !== "Contents") section = heading[1].trim();
    const source = path.relative(root, filePath).split(path.sep).join("/");
    const entry = parseResourceEntry(line, {
      context: `${source}:${lineIndex + 1}`,
      extractLeadingLabels: groupSlug === "creative-tools-and-production",
    });
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
      source,
      sourceLine: lineIndex + 1,
    });
  }
  return resources;
}

function parseAtlasPlace(markdown, filePath) {
  const locationId = markdown.match(/^<!-- atlas-location: ([a-z0-9-]+) -->$/m)?.[1];
  if (!locationId) throw new Error(`Atlas place is missing atlas-location metadata: ${path.relative(root, filePath)}`);
  let section = "Local resources";
  const resources = [];
  for (const [lineIndex, line] of markdown.split("\n").entries()) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) section = heading[1].trim();
    const source = path.relative(root, filePath).split(path.sep).join("/");
    const entry = parseAtlasResourceEntry(line, { context: `${source}:${lineIndex + 1}`, locationId });
    if (!entry) continue;
    resources.push({
      ...entry,
      associationId: `${locationId}:${entry.id}`,
      domain: new URL(entry.url).hostname.replace(/^www\./, ""),
      section,
      relationship: "specific",
      locationId,
      source,
      provenance: { kind: "place-file", source },
    });
  }
  return { locationId, resources };
}

async function buildAtlas(catalogResources) {
  const locationManifest = JSON.parse(await readFile(path.join(atlasDirectory, "locations.json"), "utf8"));
  if (!Array.isArray(locationManifest.includes)) throw new Error("Unsupported Atlas location manifest includes.");
  const includedLocationsByPath = new Map();
  for (const includePath of locationManifest.includes) {
    if (!/^locations\/[a-z0-9-]+\.json$/.test(includePath)) throw new Error(`Invalid Atlas location include path: ${includePath}`);
    includedLocationsByPath.set(includePath, JSON.parse(await readFile(path.join(atlasDirectory, includePath), "utf8")));
  }

  const geometryIdsByDataset = new Map([
    ["world", atlasTopologyGeometryIds(JSON.parse(await readFile(path.join(sourceDirectory, "data", "geometry", "countries-110m.json"), "utf8")), "countries", { allowMissing: true })],
    ["us-states", atlasTopologyGeometryIds(JSON.parse(await readFile(path.join(sourceDirectory, "data", "geometry", "states-albers-10m.json"), "utf8")), "states")],
  ]);
  const identifierDirectory = path.join(atlasDirectory, "identifiers");
  const identifierFiles = (await readdir(identifierDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const subdivisionRegistries = [];
  const subdivisionRegistryById = new Map();
  const identifierRegistries = [];
  let countryRegistry;
  for (const fileName of identifierFiles) {
    const source = JSON.parse(await readFile(path.join(identifierDirectory, fileName), "utf8"));
    const registry = source.kind === "countries"
      ? validateAtlasCountryRegistry(source, geometryIdsByDataset)
      : validateAtlasSubdivisionRegistry(source, geometryIdsByDataset);
    if (fileName !== `${registry.id}.json`) throw new Error(`Atlas identifier registry file name must match its ID: ${fileName}`);
    if (registry.kind === "countries") {
      if (countryRegistry) throw new Error(`Duplicate Atlas country registry: ${registry.id}`);
      countryRegistry = registry;
      identifierRegistries.push({
        kind: registry.kind,
        id: registry.id,
        sourceUrl: registry.sourceUrl,
        sourceRetrieved: registry.sourceRetrieved,
        countryCount: registry.countries.length,
      });
      continue;
    }
    if (subdivisionRegistryById.has(registry.id)) throw new Error(`Duplicate Atlas subdivision registry ID: ${registry.id}`);
    subdivisionRegistries.push(registry);
    subdivisionRegistryById.set(registry.id, registry);
    identifierRegistries.push({
      kind: registry.kind,
      id: registry.id,
      countryId: registry.countryId,
      sourceUrl: registry.sourceUrl,
      sourceRetrieved: registry.sourceRetrieved,
      subdivisionCount: registry.subdivisions.length,
      mappedGeometryCount: registry.subdivisions.filter((subdivision) => subdivision.geometry !== null).length,
      subdivisionTypeCounts: Object.fromEntries(ATLAS_SUBDIVISION_TYPES.map((type) => [type, registry.subdivisions.filter((subdivision) => subdivision.type === type).length])),
    });
  }
  if (!countryRegistry) throw new Error("Atlas needs a country identifier registry.");
  if (!subdivisionRegistries.length) throw new Error("Atlas needs at least one subdivision identifier registry.");

  const hierarchy = mergeAtlasLocationSources(locationManifest, includedLocationsByPath);
  const locationById = validateAtlasHierarchy(hierarchy, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById });
  const jurisdictionManifest = JSON.parse(await readFile(path.join(atlasDirectory, "jurisdictions.json"), "utf8"));
  const jurisdictionModel = validateAtlasJurisdictions(jurisdictionManifest, { countryRegistry, locationById, subdivisionRegistryById });
  const jurisdictionSourceManifest = JSON.parse(await readFile(path.join(atlasDirectory, "jurisdiction-sources.json"), "utf8"));
  const applicability = JSON.parse(await readFile(path.join(atlasDirectory, "applicability.json"), "utf8"));

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

  const placeUrls = new Set();
  for (const resource of resources) {
    const key = urlIdentity(resource.url);
    if (placeUrls.has(key)) throw new Error(`Duplicate atlas URL: ${resource.url}`);
    placeUrls.add(key);
  }
  const catalogUrls = new Set(catalogResources.map((resource) => urlIdentity(resource.url)));
  const duplicatedCatalogUrl = resources.find((resource) => catalogUrls.has(urlIdentity(resource.url)));
  if (duplicatedCatalogUrl) throw new Error(`Atlas resource already belongs in the main catalog; reference it from atlas/applicability.json instead: ${duplicatedCatalogUrl.url}`);

  const catalogResourceById = new Map(catalogResources.map((resource) => [resource.id, resource]));
  const jurisdictionSourceCoverage = validateJurisdictionSourceCoverage(jurisdictionSourceManifest, { catalogResourceById, jurisdictionById: jurisdictionModel.jurisdictionById });
  const { associations, inheritance } = validateAtlasApplicability(applicability, locationById, catalogResourceById);
  const legacyCatalogResourcesByLocation = new Map();
  for (const association of associations) {
    const catalogResource = catalogResourceById.get(association.resourceId);
    if (placeUrls.has(urlIdentity(catalogResource.url))) throw new Error(`Atlas place resource duplicates a main-catalog association: ${association.resourceId}`);
    const legacyReference = { resourceId: association.resourceId, section: association.section };
    if (association.role !== "resource") legacyReference.role = association.role;
    legacyCatalogResourcesByLocation.set(association.locationId, [...(legacyCatalogResourcesByLocation.get(association.locationId) || []), legacyReference]);
    resources.push({
      id: catalogResource.id,
      idOrigin: catalogResource.idOrigin,
      associationId: `${association.locationId}:${catalogResource.id}`,
      aliases: catalogResource.aliases,
      metadata: catalogResource.metadata,
      title: catalogResource.title,
      url: catalogResource.url,
      description: catalogResource.description,
      domain: catalogResource.domain,
      section: association.section,
      role: association.role,
      relationship: association.relationship,
      locationId: association.locationId,
      source: catalogResource.source,
      atlasSource: "atlas/applicability.json",
      provenance: association.provenance,
      catalogReference: true,
    });
    coveredLocations.add(association.locationId);
  }

  const associationIds = new Set();
  const resourceUrlById = new Map();
  for (const resource of resources) {
    if (associationIds.has(resource.associationId)) throw new Error(`Duplicate Atlas association ID: ${resource.associationId}`);
    associationIds.add(resource.associationId);
    const normalizedUrl = urlIdentity(resource.url);
    if (resourceUrlById.has(resource.id) && resourceUrlById.get(resource.id) !== normalizedUrl) throw new Error(`Atlas resource ID points to multiple URLs: ${resource.id}`);
    resourceUrlById.set(resource.id, normalizedUrl);
  }

  const coverageCache = new Map();
  const isCovered = (location) => {
    if (coverageCache.has(location.id)) return coverageCache.get(location.id);
    const covered = coveredLocations.has(location.id) || location.children.some((childId) => isCovered(locationById.get(childId)));
    coverageCache.set(location.id, covered);
    return covered;
  };
  const resourcesByLocation = deriveAtlasLocationResources(hierarchy.locations, resources, inheritance);
  for (const location of hierarchy.locations) {
    const placements = resourcesByLocation[location.id];
    location.inheritedResourceCount = placements.filter((placement) => placement.relationship === "inherited").length;
    location.resourceCount = placements.length - location.inheritedResourceCount;
    location.availableResourceCount = placements.length;
    location.covered = isCovered(location);
  }
  const locations = hierarchy.locations.map(({ children, resourceCount, availableResourceCount, inheritedResourceCount, covered, ...location }) => ({
    ...location,
    ...(legacyCatalogResourcesByLocation.has(location.id) ? { catalogResources: legacyCatalogResourcesByLocation.get(location.id) } : {}),
    children,
    resourceCount,
    availableResourceCount,
    inheritedResourceCount,
    covered,
  }));
  return {
    schemaVersion: hierarchy.schemaVersion,
    applicabilitySchemaVersion: applicability.schemaVersion,
    jurisdictionSchemaVersion: jurisdictionModel.schemaVersion,
    jurisdictionNotice: jurisdictionModel.notice,
    jurisdictionSources: jurisdictionModel.sources,
    jurisdictions: jurisdictionModel.jurisdictions,
    jurisdictionRelationships: jurisdictionModel.relationships,
    jurisdictionSourceSchemaVersion: jurisdictionSourceCoverage.schemaVersion,
    jurisdictionSourceNotice: jurisdictionSourceCoverage.notice,
    jurisdictionSourceProfiles: jurisdictionSourceCoverage.profiles,
    rootId: hierarchy.rootId,
    locationSourceCount: 1 + locationManifest.includes.length,
    identifierRegistries,
    locationCount: hierarchy.locations.length,
    resourceCount: resources.length,
    uniqueResourceCount: resourceUrlById.size,
    associationCount: associationIds.size,
    locations,
    inheritance,
    resourcesByLocation,
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

  validateResourceIdentities(resources);
  const uniqueResources = resources;
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
    schemaVersion: 2,
    resourceCount: uniqueResources.length,
    categories,
    resources: uniqueResources,
  };
  const atlas = await buildAtlas(uniqueResources);
  const overview = buildOverview(catalog);
  const funding = buildFunding(await readFile(fundingFile, "utf8"));
  const searchEvaluation = await loadEvaluationFixture(searchEvaluationFile);
  const locales = await loadLocales(sourceDirectory);

  await rm(outputDirectory, { recursive: true, force: true });
  await cp(sourceDirectory, outputDirectory, { recursive: true });
  await mkdir(path.join(outputDirectory, "data"), { recursive: true });
  await writeFile(path.join(outputDirectory, "data", "catalog.json"), `${JSON.stringify(catalog)}\n`);
  await writeFile(path.join(outputDirectory, "data", "atlas.json"), `${JSON.stringify(atlas)}\n`);
  await writeFile(path.join(outputDirectory, "data", "overview.json"), `${JSON.stringify(overview)}\n`);
  await writeFile(path.join(outputDirectory, "data", "funding.json"), `${JSON.stringify({ schemaVersion: 1, sources: funding.sources })}\n`);
  await writeFile(path.join(outputDirectory, "data", "search-evaluation-v2.json"), `${JSON.stringify(searchEvaluation)}\n`);
  await buildLocalizedPages(locales, funding);
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");
  console.log(`Built ${catalog.resourceCount} resources across ${categories.length} collections, ${overview.topicPathCount} topic paths, and ${atlas.resourceCount} place-aware atlas resources.`);
}

await build();
