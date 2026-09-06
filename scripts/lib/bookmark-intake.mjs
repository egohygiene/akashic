import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseAtlasResourceEntry, parseResourceEntry } from "./resource-parser.mjs";
import { inspectBookmarkUrl, nearUrlIdentity, urlIdentity } from "./url-identity.mjs";

const REPORT_SCHEMA_VERSION = 1;

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value) {
  return value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|amp|apos|gt|lt|quot);/gi, (entity, decimal, hexadecimal) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    return { "&amp;": "&", "&apos;": "'", "&gt;": ">", "&lt;": "<", "&quot;": "\"" }[entity.toLocaleLowerCase("en-US")];
  });
}

function normalizeLabels(value) {
  const labels = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(labels.map((label) => String(label).trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function detectBookmarkFormat(content) {
  const trimmed = content.trimStart();
  if (/^(?:<!doctype\s+netscape-bookmark-file|<meta[^>]+netscape-bookmark-file|<dl\b)/i.test(trimmed)) return "netscape-html";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "browser-json";
  throw new Error("Unsupported bookmark export. Use Netscape bookmark HTML or a Chrome/Firefox JSON export.");
}

export function parseNetscapeBookmarks(content) {
  const bookmarks = [];
  const folderFrames = [];
  const folderPath = [];
  let pendingFolder = null;
  const tokenPattern = /<DL\b[^>]*>|<\/DL\s*>|<H3\b[^>]*>([\s\S]*?)<\/H3\s*>|<A\b([^>]*)>([\s\S]*?)<\/A\s*>/gi;
  for (const match of content.matchAll(tokenPattern)) {
    const token = match[0];
    if (/^<H3\b/i.test(token)) {
      pendingFolder = decodeHtml(match[1].replace(/<[^>]*>/g, "").trim());
      continue;
    }
    if (/^<DL\b/i.test(token)) {
      const frame = pendingFolder || null;
      folderFrames.push(frame);
      if (frame) folderPath.push(frame);
      pendingFolder = null;
      continue;
    }
    if (/^<\/DL/i.test(token)) {
      const frame = folderFrames.pop();
      if (frame) folderPath.pop();
      pendingFolder = null;
      continue;
    }
    const attributes = match[2];
    const href = attributes.match(/\bHREF\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!href) continue;
    const tags = attributes.match(/\bTAGS\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    bookmarks.push({
      title: decodeHtml(match[3].replace(/<[^>]*>/g, "").trim()),
      url: decodeHtml(href[1] ?? href[2] ?? href[3]),
      folders: [...folderPath],
      labels: normalizeLabels(tags ? decodeHtml(tags[1] ?? tags[2] ?? tags[3]) : []),
    });
  }
  return bookmarks;
}

export function parseBrowserJson(content) {
  let source;
  try {
    source = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid bookmark JSON: ${error.message}`);
  }
  const bookmarks = [];

  function visit(node, folders = []) {
    if (Array.isArray(node)) {
      for (const child of node) visit(child, folders);
      return;
    }
    if (!node || typeof node !== "object") return;
    const url = typeof node.url === "string" ? node.url : typeof node.uri === "string" ? node.uri : null;
    const title = typeof node.name === "string" ? node.name : typeof node.title === "string" ? node.title : "";
    if (url) {
      bookmarks.push({ title: title.trim(), url, folders: [...folders], labels: normalizeLabels(node.tags) });
    }
    const childFolders = Array.isArray(node.children) && title.trim() ? [...folders, title.trim()] : folders;
    if (Array.isArray(node.children)) visit(node.children, childFolders);
    if (node.roots && typeof node.roots === "object") visit(Object.values(node.roots), folders);
  }

  visit(source);
  return bookmarks;
}

export function parseBookmarkExport(content, format = "auto") {
  const detectedFormat = format === "auto" ? detectBookmarkFormat(content) : format;
  if (detectedFormat === "netscape-html") return { format: detectedFormat, bookmarks: parseNetscapeBookmarks(content) };
  if (detectedFormat === "browser-json") return { format: detectedFormat, bookmarks: parseBrowserJson(content) };
  throw new Error(`Unsupported bookmark format: ${detectedFormat}`);
}

async function findReadmes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findReadmes(entryPath);
    return entry.isFile() && entry.name === "README.md" ? [entryPath] : [];
  }));
  return files.flat().sort();
}

function normalizedTitle(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
}

function indexResource(index, resource) {
  const indexed = {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    source: resource.source,
    kind: resource.kind,
  };
  const identity = urlIdentity(resource.url);
  index.currentByIdentity.set(identity, [...(index.currentByIdentity.get(identity) || []), indexed]);
  const nearIdentity = nearUrlIdentity(resource.url);
  index.nearByIdentity.set(nearIdentity, [...(index.nearByIdentity.get(nearIdentity) || []), indexed]);
  const title = normalizedTitle(resource.title);
  if (title) index.byTitle.set(title, [...(index.byTitle.get(title) || []), indexed]);
  for (const alias of resource.aliases || []) {
    const aliasIdentity = urlIdentity(alias);
    index.aliasByIdentity.set(aliasIdentity, [...(index.aliasByIdentity.get(aliasIdentity) || []), indexed]);
  }
  index.resources.push(indexed);
}

export async function loadRepositoryResourceIndex(root) {
  const index = {
    resources: [],
    currentByIdentity: new Map(),
    aliasByIdentity: new Map(),
    nearByIdentity: new Map(),
    byTitle: new Map(),
  };
  for (const filePath of await findReadmes(path.join(root, "lists"))) {
    const source = path.relative(root, filePath).split(path.sep).join("/");
    const content = await readFile(filePath, "utf8");
    for (const [lineIndex, line] of content.split("\n").entries()) {
      const resource = parseResourceEntry(line, { context: `${source}:${lineIndex + 1}` });
      if (resource) indexResource(index, { ...resource, source, kind: "catalog" });
    }
  }
  const placeDirectory = path.join(root, "atlas", "places");
  const placeFiles = (await readdir(placeDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(placeDirectory, entry.name))
    .sort();
  for (const filePath of placeFiles) {
    const source = path.relative(root, filePath).split(path.sep).join("/");
    const content = await readFile(filePath, "utf8");
    const locationId = content.match(/^<!-- atlas-location: ([a-z0-9-]+) -->$/m)?.[1];
    for (const [lineIndex, line] of content.split("\n").entries()) {
      const resource = parseAtlasResourceEntry(line, { context: `${source}:${lineIndex + 1}`, locationId });
      if (resource) indexResource(index, { ...resource, source, kind: "atlas" });
    }
  }
  return index;
}

function conciseMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    const key = `${match.kind}\u0000${match.id}\u0000${match.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => left.source.localeCompare(right.source) || left.title.localeCompare(right.title)).slice(0, 5);
}

function classifyCandidate(bookmark, inspected, index, importedByIdentity) {
  const currentMatches = index.currentByIdentity.get(inspected.identity) || [];
  if (currentMatches.length) return { classification: "duplicate", reasons: ["catalog-url"], matches: conciseMatches(currentMatches) };
  const aliasMatches = index.aliasByIdentity.get(inspected.identity) || [];
  if (aliasMatches.length) return { classification: "redirected", reasons: ["catalog-alias"], matches: conciseMatches(aliasMatches) };
  if (importedByIdentity.has(inspected.identity)) {
    return { classification: "duplicate", reasons: ["same-import"], matches: [{ kind: "bookmark", candidateId: importedByIdentity.get(inspected.identity) }] };
  }

  const nearMatches = [
    ...(index.nearByIdentity.get(inspected.nearIdentity) || []),
    ...(index.byTitle.get(normalizedTitle(bookmark.title)) || []),
  ];
  if (nearMatches.length) return { classification: "needs-review", reasons: ["near-duplicate"], matches: conciseMatches(nearMatches) };
  return { classification: "plausible-addition", reasons: ["no-catalog-match"], matches: [] };
}

function countBy(values, selector) {
  return Object.fromEntries([...values.reduce((counts, value) => {
    const key = selector(value);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map())]
    .sort(([left], [right]) => left.localeCompare(right)));
}

function repositoryIndexDigest(index) {
  const snapshot = [
    ...[...index.currentByIdentity.entries()].map(([identity, matches]) => ["current", identity, matches]),
    ...[...index.aliasByIdentity.entries()].map(([identity, matches]) => ["alias", identity, matches]),
  ].map(([role, identity, matches]) => [role, identity, matches.map((match) => `${match.kind}:${match.id}:${match.source}`).sort()])
    .sort(([leftRole, leftIdentity], [rightRole, rightIdentity]) => leftRole.localeCompare(rightRole) || leftIdentity.localeCompare(rightIdentity));
  return digest(JSON.stringify(snapshot));
}

export function createBookmarkIntakeReport({ content, format, bookmarks, index, offset = 0, limit = 50 }) {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Bookmark report offset must be a non-negative integer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("Bookmark report limit must be between 1 and 200.");
  const accepted = [];
  const rejections = [];
  const importedByIdentity = new Map();

  for (const [inputIndex, bookmark] of bookmarks.entries()) {
    const inspected = inspectBookmarkUrl(bookmark.url);
    if (!inspected.accepted) {
      rejections.push({ inputIndex, reason: inspected.reason, fingerprint: digest(String(bookmark.url)).slice(0, 16) });
      continue;
    }
    const candidateId = digest(inspected.identity).slice(0, 16);
    const classification = classifyCandidate(bookmark, inspected, index, importedByIdentity);
    accepted.push({
      inputIndex,
      candidateId,
      title: bookmark.title || new URL(inspected.canonicalUrl).hostname,
      url: inspected.canonicalUrl,
      folders: bookmark.folders,
      labels: bookmark.labels,
      removedTrackingParameters: inspected.removedTrackingParameters,
      ...classification,
    });
    if (!importedByIdentity.has(inspected.identity)) importedByIdentity.set(inspected.identity, candidateId);
  }

  const candidates = accepted.slice(offset, offset + limit);
  const nextOffset = offset + candidates.length < accepted.length ? offset + candidates.length : null;
  const rejectionSampleLimit = Math.min(limit, 50);
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    mode: "offline-human-review",
    source: { format, sha256: digest(content) },
    catalog: { resourceCount: index.resources.length, sha256: repositoryIndexDigest(index) },
    totals: {
      parsed: bookmarks.length,
      rejected: rejections.length,
      reviewable: accepted.length,
      classifications: countBy(accepted, (candidate) => candidate.classification),
      rejectionReasons: countBy(rejections, (rejection) => rejection.reason),
    },
    batch: { offset, limit, returned: candidates.length, nextOffset },
    candidates,
    rejected: {
      count: rejections.length,
      sample: rejections.slice(0, rejectionSampleLimit),
      sampleTruncated: rejections.length > rejectionSampleLimit,
    },
    notices: [
      "This report is local review material and must not be committed.",
      "No candidate was published, deleted, fetched, or treated as current.",
      "Inaccessible and live redirect states require a later observed freshness check.",
    ],
  };
}

export function bookmarkIntakeSummary(report) {
  return {
    schemaVersion: report.schemaVersion,
    mode: report.mode,
    source: report.source,
    catalog: report.catalog,
    totals: report.totals,
    batch: report.batch,
    notices: report.notices,
  };
}
