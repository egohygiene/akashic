#!/usr/bin/env node
/**
 * validate-collection.mjs
 *
 * Repository-wide collection validator for the Ego Hygiene Awesome collection.
 * Uses only Node.js built-in modules. Exits with a nonzero status when any
 * invariant is violated.
 *
 * Usage: node scripts/validate-collection.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LISTS_DIR = join(ROOT, "lists");
const ROOT_README = join(ROOT, "README.md");
const CONTRIBUTING = join(ROOT, "contributing.md");

// ─── helpers ─────────────────────────────────────────────────────────────────

let errors = 0;

function fail(msg) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function info(msg) {
  console.log(`  ${msg}`);
}

function readFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    fail(`Cannot read file: ${relative(ROOT, path)}`);
    return null;
  }
}

function listSubdirs(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => statSync(join(dir, name)).isDirectory())
      .sort();
  } catch {
    return [];
  }
}

// ─── discovery ───────────────────────────────────────────────────────────────

const EXPECTED_SUBLISTS = [
  "artificial-intelligence",
  "containers-and-cloud",
  "creative-resources",
  "developer-tools",
  "health-and-well-being",
  "open-source",
  "public-services-and-support",
  "research-funding-and-grants",
  "scientific-research",
  "security",
  "self-hosting-and-homelab",
  "tex-and-typesetting",
  "web-development",
  "work-and-learning",
];

const actualSubdirs = listSubdirs(LISTS_DIR);

console.log("\n=== Collection Validation ===\n");

// ─── check expected sublists exist ───────────────────────────────────────────

console.log("Checking expected sublists exist...");
for (const slug of EXPECTED_SUBLISTS) {
  const path = join(LISTS_DIR, slug, "README.md");
  const content = readFile(path);
  if (!content) {
    fail(`Missing expected sublist: lists/${slug}/README.md`);
  }
}

// check for unexpected sublists
for (const dir of actualSubdirs) {
  if (!EXPECTED_SUBLISTS.includes(dir)) {
    fail(`Unexpected sublist directory: lists/${dir} (not in expected list)`);
  }
}

// ─── parse root README ────────────────────────────────────────────────────────

console.log("\nParsing root README...");
const rootContent = readFile(ROOT_README);
if (!rootContent) process.exit(1);

// extract links to sublists from root (lines like: - [Name](lists/.../README.md))
const ROOT_LINK_RE =
  /^-\s+\[([^\]]+)\]\((lists\/([^/]+)\/README\.md)\)\s+-\s+.*\*\*(\d+)\s+resources?\.\*\*/gm;
const rootLinks = new Map(); // slug -> { title, path, displayCount }
for (const m of rootContent.matchAll(ROOT_LINK_RE)) {
  const [, title, path, slug, countStr] = m;
  rootLinks.set(slug, { title, path, displayCount: parseInt(countStr, 10) });
}

// verify root links to sublists
console.log("\nVerifying root index links...");
for (const slug of EXPECTED_SUBLISTS) {
  if (!rootLinks.has(slug)) {
    fail(`Root README does not link to sublist: lists/${slug}/README.md`);
  }
}
for (const [slug] of rootLinks) {
  if (!EXPECTED_SUBLISTS.includes(slug)) {
    fail(`Root README links to unknown sublist slug: ${slug}`);
  }
}

// ─── resource-entry pattern ───────────────────────────────────────────────────

// Standard entry: - [Title](https://...) - Description.
const ENTRY_RE = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s+-\s+(.+)$/;

// ─── per-sublist validation ───────────────────────────────────────────────────

console.log("\nValidating sublists...");

const allExternalUrls = new Map(); // url -> file
const allTitles = new Map(); // lower title -> file

let collectionTotal = 0;

// also collect Meta entries from root README
const META_RE = /^## Meta\n([\s\S]*?)(?=^## |\z)/m;
const metaMatch = rootContent.match(META_RE);
if (metaMatch) {
  for (const line of metaMatch[1].split("\n")) {
    const m = line.match(ENTRY_RE);
    if (!m) continue;
    const [, title, url] = m;
    const lowerTitle = title.toLowerCase();
    if (allExternalUrls.has(url)) {
      fail(
        `Duplicate URL in root Meta and ${allExternalUrls.get(url)}: ${url}`
      );
    } else {
      allExternalUrls.set(url, "README.md (Meta)");
    }
    if (allTitles.has(lowerTitle)) {
      fail(
        `Duplicate title (case-insensitive) in root Meta and ${allTitles.get(lowerTitle)}: "${title}"`
      );
    } else {
      allTitles.set(lowerTitle, "README.md (Meta)");
    }
  }
}

for (const slug of EXPECTED_SUBLISTS) {
  const filePath = join(LISTS_DIR, slug, "README.md");
  const content = readFile(filePath);
  if (!content) continue;
  const rel = `lists/${slug}/README.md`;

  // check back-link to root
  if (!content.includes("(../../README.md)")) {
    fail(`${rel}: missing back-link to ../../README.md`);
  }

  // check link to contributing.md
  if (!content.includes("(../../contributing.md)")) {
    fail(`${rel}: missing link to ../../contributing.md`);
  }

  // check Contents section exists
  if (!/^## Contents\s*$/m.test(content)) {
    fail(`${rel}: missing "## Contents" section`);
  }

  // extract ## headings (subsections, excluding Contents and the title-level)
  const headings = [];
  for (const m of content.matchAll(/^## (.+)$/gm)) {
    const heading = m[1].trim();
    if (heading !== "Contents") {
      headings.push(heading);
    }
  }

  // extract TOC entries from Contents section
  const contentsMatch = content.match(
    /^## Contents\s*\n([\s\S]*?)(?=^## [^C]|\n## (?!Contents))/m
  );
  const tocEntries = new Set();
  if (contentsMatch) {
    for (const m of contentsMatch[1].matchAll(
      /^\s*-\s+\[([^\]]+)\]\(#[^)]+\)/gm
    )) {
      tocEntries.add(m[1].trim());
    }
  }

  // verify each heading is in TOC
  for (const heading of headings) {
    if (!tocEntries.has(heading)) {
      fail(`${rel}: subsection "${heading}" is missing from Contents TOC`);
    }
  }

  // verify each TOC entry has a heading
  for (const toc of tocEntries) {
    if (!headings.includes(toc)) {
      fail(
        `${rel}: Contents TOC entry "${toc}" does not match any ## heading`
      );
    }
  }

  // count and validate resource entries
  let sublistCount = 0;
  for (const line of content.split("\n")) {
    if (!line.startsWith("- [")) continue;
    // skip navigation links (they link to relative paths, not http)
    const m = line.match(ENTRY_RE);
    if (!m) continue;

    sublistCount++;
    const [, title, url] = m;
    const lowerTitle = title.toLowerCase();

    if (allExternalUrls.has(url)) {
      fail(
        `Duplicate URL in ${rel} and ${allExternalUrls.get(url)}: ${url}`
      );
    } else {
      allExternalUrls.set(url, rel);
    }

    if (allTitles.has(lowerTitle)) {
      fail(
        `Duplicate title (case-insensitive) in ${rel} and ${allTitles.get(lowerTitle)}: "${title}"`
      );
    } else {
      allTitles.set(lowerTitle, rel);
    }
  }

  collectionTotal += sublistCount;
  info(`${rel}: ${sublistCount} resources`);

  // compare with root index display count
  if (rootLinks.has(slug)) {
    const { displayCount } = rootLinks.get(slug);
    if (displayCount !== sublistCount) {
      fail(
        `${rel}: root index shows ${displayCount} resources but sublist contains ${sublistCount}`
      );
    }
  }
}

// ─── summary ─────────────────────────────────────────────────────────────────

console.log(`\nCollection total: ${collectionTotal} resources`);
console.log(`Unique URLs: ${allExternalUrls.size}`);
console.log(`Unique titles: ${allTitles.size}`);

if (errors === 0) {
  console.log("\n✓ All collection invariants passed.\n");
  process.exit(0);
} else {
  console.log(`\n✗ Validation failed with ${errors} error(s).\n`);
  process.exit(1);
}
