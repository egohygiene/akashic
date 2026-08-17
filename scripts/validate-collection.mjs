#!/usr/bin/env node
/**
 * validate-collection.mjs
 *
 * Repository-wide collection validator for akashic, the Ego Hygiene knowledge collection.
 * Uses only Node.js built-in modules. Exits with a nonzero status when any
 * invariant is violated.
 *
 * Usage: node scripts/validate-collection.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LISTS_DIR = join(ROOT, "lists");
const ROOT_README = join(ROOT, "README.md");

const EXPECTED_TOP_LEVEL_LISTS = [
  "artificial-intelligence",
  "awesome-abundance",
  "containers-and-cloud",
  "creative-resources",
  "developer-tools",
  "health-and-well-being",
  "neuroscience",
  "open-source",
  "psychedelics",
  "public-services-and-support",
  "research",
  "research-funding-and-grants",
  "scientific-research",
  "security",
  "self-hosting-and-homelab",
  "spirituality-religion-and-occult",
  "tex-and-typesetting",
  "web-development",
  "work-and-learning",
];

const NESTED_COLLECTIONS = new Map([
  [
    "awesome-abundance",
    [
      "books-knowledge-and-archives",
      "community-sharing-and-material-resources",
      "creative-commons-and-media",
      "creative-tools-and-production",
      "culture-travel-and-participation",
      "developer-and-digital-resources",
      "education-and-learning",
      "free-and-open-source-software",
      "health-well-being-and-accessibility",
      "libraries-and-local-access",
      "public-programs-and-services",
      "research-and-open-science",
      "subscription-alternatives",
    ],
  ],
]);

const ENTRY_RE = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s+-\s+(.+)$/;
const ROOT_LINK_RE =
  /^-\s+\[([^\]]+)\]\((lists\/([^/]+)\/README\.md)\)\s+-\s+.*\*\*(\d+)\s+resources?\.\*\*/gm;
const CHILD_LINK_RE =
  /^-\s+\[([^\]]+)\]\(([^/()]+)\/README\.md\)\s+-\s+.*\*\*(\d+)\s+resources?\.\*\*/gm;

let errors = 0;
const allExternalUrls = new Map();
const allTitles = new Map();

function fail(message) {
  console.error(`  ERROR: ${message}`);
  errors += 1;
}

function info(message) {
  console.log(`  ${message}`);
}

function readFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    fail(`Cannot read file: ${relative(ROOT, path)}`);
    return null;
  }
}

function listSubdirs(directory) {
  try {
    return readdirSync(directory)
      .filter((name) => statSync(join(directory, name)).isDirectory())
      .sort();
  } catch {
    return [];
  }
}

function extractSection(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) return null;
  const bodyStart = content.indexOf("\n", start) + 1;
  const nextHeading = content.indexOf("\n## ", bodyStart);
  return content.slice(bodyStart, nextHeading === -1 ? content.length : nextHeading);
}

function recordExternalEntry(title, url, source) {
  const lowerTitle = title.toLowerCase();

  if (allExternalUrls.has(url)) {
    fail(`Duplicate URL in ${source} and ${allExternalUrls.get(url)}: ${url}`);
  } else {
    allExternalUrls.set(url, source);
  }

  if (allTitles.has(lowerTitle)) {
    fail(
      `Duplicate title (case-insensitive) in ${source} and ${allTitles.get(lowerTitle)}: "${title}"`
    );
  } else {
    allTitles.set(lowerTitle, source);
  }
}

function validateList(relativePath, requiredLinks) {
  const filePath = join(ROOT, relativePath);
  const content = readFile(filePath);
  if (!content) return { content: null, resourceCount: 0 };

  for (const requiredLink of requiredLinks) {
    if (!content.includes(`(${requiredLink})`)) {
      fail(`${relativePath}: missing link to ${requiredLink}`);
    }
  }

  if (!/^## Contents\s*$/m.test(content)) {
    fail(`${relativePath}: missing "## Contents" section`);
  }

  const headings = [...content.matchAll(/^## (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((heading) => heading !== "Contents");
  const contentsSection = extractSection(content, "Contents") ?? "";
  const tocEntries = new Set(
    [...contentsSection.matchAll(/^\s*-\s+\[([^\]]+)\]\(#[^)]+\)/gm)].map(
      (match) => match[1].trim()
    )
  );

  for (const heading of headings) {
    if (!tocEntries.has(heading)) {
      fail(`${relativePath}: subsection "${heading}" is missing from Contents TOC`);
    }
  }
  for (const tocEntry of tocEntries) {
    if (!headings.includes(tocEntry)) {
      fail(
        `${relativePath}: Contents TOC entry "${tocEntry}" does not match any ## heading`
      );
    }
  }

  let resourceCount = 0;
  for (const line of content.split("\n")) {
    const match = line.match(ENTRY_RE);
    if (!match) continue;
    resourceCount += 1;
    recordExternalEntry(match[1], match[2], relativePath);
  }

  return { content, resourceCount };
}

console.log("\n=== Collection Validation ===\n");

console.log("Checking expected top-level lists...");
const actualTopLevelLists = listSubdirs(LISTS_DIR);
for (const slug of EXPECTED_TOP_LEVEL_LISTS) {
  readFile(join(LISTS_DIR, slug, "README.md"));
}
for (const slug of actualTopLevelLists) {
  if (!EXPECTED_TOP_LEVEL_LISTS.includes(slug)) {
    fail(`Unexpected list directory: lists/${slug}`);
  }
}

console.log("\nParsing root README...");
const rootContent = readFile(ROOT_README);
if (!rootContent) process.exit(1);

const rootLinks = new Map();
for (const match of rootContent.matchAll(ROOT_LINK_RE)) {
  const [, title, path, slug, countString] = match;
  rootLinks.set(slug, {
    title,
    path,
    displayCount: Number.parseInt(countString, 10),
  });
}

console.log("\nVerifying root index links...");
for (const slug of EXPECTED_TOP_LEVEL_LISTS) {
  if (!rootLinks.has(slug)) {
    fail(`Root README does not link to list: lists/${slug}/README.md`);
  }
}
for (const slug of rootLinks.keys()) {
  if (!EXPECTED_TOP_LEVEL_LISTS.includes(slug)) {
    fail(`Root README links to unknown list slug: ${slug}`);
  }
}

const metaSection = extractSection(rootContent, "Meta") ?? "";
for (const line of metaSection.split("\n")) {
  const match = line.match(ENTRY_RE);
  if (match) recordExternalEntry(match[1], match[2], "README.md (Meta)");
}

console.log("\nValidating lists...");
let collectionTotal = 0;

for (const slug of EXPECTED_TOP_LEVEL_LISTS) {
  const relativePath = `lists/${slug}/README.md`;

  if (!NESTED_COLLECTIONS.has(slug)) {
    const { resourceCount } = validateList(relativePath, [
      "../../README.md",
      "../../contributing.md",
    ]);
    collectionTotal += resourceCount;
    info(`${relativePath}: ${resourceCount} resources`);

    const displayCount = rootLinks.get(slug)?.displayCount;
    if (displayCount !== resourceCount) {
      fail(
        `${relativePath}: root index shows ${displayCount ?? "no count"} resources but list contains ${resourceCount}`
      );
    }
    continue;
  }

  const { content: hubContent } = validateList(relativePath, [
    "../../README.md",
    "../../contributing.md",
  ]);
  if (!hubContent) continue;

  const collectionDirectory = join(LISTS_DIR, slug);
  const expectedChildren = NESTED_COLLECTIONS.get(slug);
  const actualChildren = listSubdirs(collectionDirectory);
  const childLinks = new Map();

  for (const match of hubContent.matchAll(CHILD_LINK_RE)) {
    const [, title, childSlug, countString] = match;
    childLinks.set(childSlug, {
      title,
      displayCount: Number.parseInt(countString, 10),
    });
  }

  for (const childSlug of expectedChildren) {
    if (!actualChildren.includes(childSlug)) {
      fail(`Missing nested list directory: lists/${slug}/${childSlug}`);
    }
    if (!childLinks.has(childSlug)) {
      fail(`${relativePath}: missing link to nested list ${childSlug}/README.md`);
    }
  }
  for (const childSlug of actualChildren) {
    if (!expectedChildren.includes(childSlug)) {
      fail(`Unexpected nested list directory: lists/${slug}/${childSlug}`);
    }
  }
  for (const childSlug of childLinks.keys()) {
    if (!expectedChildren.includes(childSlug)) {
      fail(`${relativePath}: links to unknown nested list ${childSlug}`);
    }
  }

  let nestedTotal = 0;
  for (const childSlug of expectedChildren) {
    const childPath = `lists/${slug}/${childSlug}/README.md`;
    const { resourceCount } = validateList(childPath, [
      "../../../README.md",
      "../../../contributing.md",
      "../README.md",
    ]);
    nestedTotal += resourceCount;
    info(`${childPath}: ${resourceCount} resources`);

    const displayCount = childLinks.get(childSlug)?.displayCount;
    if (displayCount !== resourceCount) {
      fail(
        `${childPath}: collection hub shows ${displayCount ?? "no count"} resources but list contains ${resourceCount}`
      );
    }
  }

  collectionTotal += nestedTotal;
  info(`${relativePath}: ${nestedTotal} resources across nested lists`);

  const rootDisplayCount = rootLinks.get(slug)?.displayCount;
  if (rootDisplayCount !== nestedTotal) {
    fail(
      `${relativePath}: root index shows ${rootDisplayCount ?? "no count"} resources but nested lists contain ${nestedTotal}`
    );
  }
}

console.log(`\nCollection total: ${collectionTotal} resources`);
console.log(`Unique URLs: ${allExternalUrls.size}`);
console.log(`Unique titles: ${allTitles.size}`);

if (errors === 0) {
  console.log("\n✓ All collection invariants passed.\n");
  process.exit(0);
}

console.log(`\n✗ Validation failed with ${errors} error(s).\n`);
process.exit(1);
