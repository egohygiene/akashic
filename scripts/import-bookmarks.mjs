#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { bookmarkIntakeSummary, createBookmarkIntakeReport, loadRepositoryResourceIndex, parseBookmarkExport } from "./lib/bookmark-intake.mjs";

function usage() {
  return "Usage: node scripts/import-bookmarks.mjs --input <export> [--format auto|netscape-html|browser-json] [--offset N] [--limit N] [--output .akashic-local/bookmark-intake/report.json] [--dry-run]";
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
    if (!["--input", "--format", "--offset", "--limit", "--output"].includes(argument)) throw new Error(`Unknown argument: ${argument}\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`);
    index += 1;
    if (argument === "--input") options.input = value;
    if (argument === "--format") options.format = value;
    if (argument === "--offset") options.offset = parseInteger(value, "--offset");
    if (argument === "--limit") options.limit = parseInteger(value, "--limit");
    if (argument === "--output") options.output = value;
  }
  if (!options.input) throw new Error(`--input is required.\n${usage()}`);
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

async function main() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  const paths = validateLocalPaths(root, options);
  const content = await readFile(paths.input, "utf8");
  const parsed = parseBookmarkExport(content, options.format);
  const index = await loadRepositoryResourceIndex(root);
  const report = createBookmarkIntakeReport({
    content,
    format: parsed.format,
    bookmarks: parsed.bookmarks,
    index,
    offset: options.offset,
    limit: options.limit,
  });
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(bookmarkIntakeSummary(report), null, 2)}\n`);
    return;
  }
  await mkdir(path.dirname(paths.output), { recursive: true });
  await writeFile(paths.output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ output: path.relative(root, paths.output), ...bookmarkIntakeSummary(report) }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
