#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadRepositoryResourceIndex } from "./lib/bookmark-intake.mjs";
import { createFreshnessReviewReport, emptyFreshnessState, reduceFreshnessObservations } from "./lib/freshness.mjs";

const DEFAULT_EXCEPTIONS = "maintenance/freshness/exceptions.json";

function usage() {
  return "Usage: node scripts/reduce-freshness-observations.mjs --observations <batch.json> --as-of YYYY-MM-DD [--state <state-or-report.json>] [--exceptions <ledger.json>] [--offset N] [--limit N] [--output .akashic-local/freshness/report.json] [--dry-run]";
}

function parseInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function parseArguments(args) {
  const options = { exceptions: DEFAULT_EXCEPTIONS, offset: 0, limit: 50, dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!["--observations", "--state", "--exceptions", "--as-of", "--offset", "--limit", "--output"].includes(argument)) throw new Error(`Unknown argument: ${argument}\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`);
    index += 1;
    if (argument === "--observations") options.observations = value;
    if (argument === "--state") options.state = value;
    if (argument === "--exceptions") options.exceptions = value;
    if (argument === "--as-of") options.asOf = value;
    if (argument === "--offset") options.offset = parseInteger(value, "--offset");
    if (argument === "--limit") options.limit = parseInteger(value, "--limit");
    if (argument === "--output") options.output = value;
  }
  if (!options.observations || !options.asOf) throw new Error(`--observations and --as-of are required.\n${usage()}`);
  if (options.dryRun && options.output) throw new Error("--dry-run cannot be combined with --output.");
  if (!options.dryRun && !options.output) throw new Error(`Use --dry-run or provide --output inside .akashic-local/freshness/.\n${usage()}`);
  return options;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error.message}`);
  }
}

function extractState(value) {
  return value.proposedState || value;
}

async function main() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  const privateRoot = path.join(root, ".akashic-local", "freshness");
  const output = options.output ? path.resolve(options.output) : null;
  if (output && !isWithin(privateRoot, output)) throw new Error("Freshness reports must stay under .akashic-local/freshness/.");

  const index = await loadRepositoryResourceIndex(root);
  const bundle = await readJson(path.resolve(options.observations), "freshness observations");
  const exceptions = await readJson(path.resolve(options.exceptions), "freshness exceptions");
  const previousState = options.state ? extractState(await readJson(path.resolve(options.state), "freshness state")) : emptyFreshnessState(index);
  const proposedState = reduceFreshnessObservations({ bundle, previousState, index });
  const reviewReport = createFreshnessReviewReport({ state: proposedState, exceptions, index, asOf: options.asOf, offset: options.offset, limit: options.limit });
  const result = {
    schemaVersion: 1,
    proposedState,
    reviewReport,
    notices: [
      "The proposed state and queue require human review before any catalog metadata changes.",
      "This reducer performed no network requests and made no catalog edits.",
    ],
  };
  const summary = {
    schemaVersion: result.schemaVersion,
    proposedState: { updatedAt: proposedState.updatedAt, observedResourceCount: proposedState.records.length },
    reviewReport: { asOf: reviewReport.asOf, catalog: reviewReport.catalog, summary: reviewReport.summary, batch: reviewReport.batch, notices: reviewReport.notices },
    notices: result.notices,
  };
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ output: path.relative(root, output), ...summary }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
