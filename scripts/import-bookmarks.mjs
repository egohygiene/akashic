#!/usr/bin/env node

import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { bookmarkIntakeSummary, createBookmarkIntakeReport, loadRepositoryResourceIndex, parseBookmarkExport } from "./lib/bookmark-intake.mjs";
import { enrichBookmarkIntakeWithFreshness } from "./lib/bookmark-freshness.mjs";

function usage() {
  return "Usage: node scripts/import-bookmarks.mjs --input <export> [--freshness <reducer.json> --as-of YYYY-MM-DD] [--freshness-max-age-days N] [--exceptions <ledger.json>] [--format auto|netscape-html|browser-json] [--offset N] [--limit N] [--output .akashic-local/bookmark-intake/report.json] [--dry-run]";
}

function parseInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function parseArguments(args) {
  const options = { format: "auto", offset: 0, limit: 50, dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!["--input", "--format", "--offset", "--limit", "--output", "--freshness", "--as-of", "--freshness-max-age-days", "--exceptions"].includes(argument)) throw new Error(`Unknown argument.\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`);
    index += 1;
    if (argument === "--input") options.input = value;
    if (argument === "--format") options.format = value;
    if (argument === "--offset") options.offset = parseInteger(value, "--offset");
    if (argument === "--limit") options.limit = parseInteger(value, "--limit");
    if (argument === "--output") options.output = value;
    if (argument === "--freshness") options.freshness = value;
    if (argument === "--as-of") options.asOf = value;
    if (argument === "--freshness-max-age-days") options.maxAgeDays = parseInteger(value, "--freshness-max-age-days");
    if (argument === "--exceptions") options.exceptions = value;
  }
  if (!options.input) throw new Error(`--input is required.\n${usage()}`);
  if (Boolean(options.freshness) !== Boolean(options.asOf) || (!options.freshness && (options.exceptions || options.maxAgeDays !== undefined))) throw new Error("Freshness evidence requires both --freshness and --as-of.");
  if (options.dryRun && options.output) throw new Error("--dry-run cannot be combined with --output.");
  if (!options.dryRun && !options.output) throw new Error(`Use --dry-run or provide --output inside .akashic-local/bookmark-intake/.\n${usage()}`);
  return options;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateLocalPaths(root, options) {
  const privateRoot = path.join(root, ".akashic-local", "bookmark-intake");
  const input = path.resolve(options.input);
  if (isWithin(root, input) && !isWithin(privateRoot, input)) {
    throw new Error("Bookmark exports inside the repository must be stored under .akashic-local/bookmark-intake/.");
  }
  if (options.output) {
    const output = path.resolve(options.output);
    if (!isWithin(privateRoot, output)) throw new Error("Bookmark reports must stay under .akashic-local/bookmark-intake/.");
    return { input, output };
  }
  return { input, output: null };
}

async function preparePrivateOutput(root, output) {
  let current = await realpath(root);
  for (const component of path.relative(root, path.dirname(output)).split(path.sep)) {
    current = path.join(current, component);
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const info = await lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Bookmark reports must stay under a real private directory without symlink parents.");
  }
}

async function main() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  const paths = validateLocalPaths(root, options);
  const content = await readFile(paths.input, "utf8");
  const parsed = parseBookmarkExport(content, options.format);
  const index = await loadRepositoryResourceIndex(root);
  let report = createBookmarkIntakeReport({
    content,
    format: parsed.format,
    bookmarks: parsed.bookmarks,
    index,
    offset: options.offset,
    limit: options.limit,
  });
  if (options.freshness) {
    const evidenceContent = await readFile(path.resolve(options.freshness), "utf8");
    const exceptions = JSON.parse(await readFile(path.resolve(options.exceptions || "maintenance/freshness/exceptions.json"), "utf8"));
    report = enrichBookmarkIntakeWithFreshness({ report, index, evidenceContent, exceptions, asOf: options.asOf, maxAgeDays: options.maxAgeDays });
  }
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(bookmarkIntakeSummary(report), null, 2)}\n`);
    return;
  }
  await preparePrivateOutput(root, paths.output);
  await writeFile(paths.output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ written: true, ...bookmarkIntakeSummary(report) }, null, 2)}\n`);
}

main().catch((error) => {
  const safe = /^(?:Freshness evidence|Bookmark reports must stay under|Bookmark exports inside the repository)/.test(error.message);
  console.error(safe ? error.message : "Bookmark intake failed; check private paths, format, freshness schema/catalog binding, reference date and unused output path.");
  process.exitCode = 1;
});
