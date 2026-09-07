#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadRepositoryResourceIndex } from "./lib/bookmark-intake.mjs";
import { createDomainThrottle, createFreshnessTransport, scanFreshnessTargets, selectFreshnessTargets } from "./lib/freshness-scanner.mjs";

function usage() {
  return "Usage: node scripts/scan-freshness.mjs [--changed-since <git-ref>] [--shard-index N --shard-count N] [--concurrency N] [--domain-delay-ms N] [--timeout-ms N] [--retries N] [--output .akashic-local/freshness/observations/batch.json] [--dry-run]";
}

function parseInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function parseArguments(args) {
  const options = { shardIndex: 0, shardCount: 1, concurrency: 8, domainDelayMs: 1_000, timeoutMs: 10_000, retries: 1, dryRun: false };
  const valued = new Set(["--changed-since", "--shard-index", "--shard-count", "--concurrency", "--domain-delay-ms", "--timeout-ms", "--retries", "--output"]);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!valued.has(argument)) throw new Error(`Unknown argument: ${argument}\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`);
    index += 1;
    if (argument === "--changed-since") options.changedSince = value;
    if (argument === "--shard-index") options.shardIndex = parseInteger(value, argument);
    if (argument === "--shard-count") options.shardCount = parseInteger(value, argument);
    if (argument === "--concurrency") options.concurrency = parseInteger(value, argument);
    if (argument === "--domain-delay-ms") options.domainDelayMs = parseInteger(value, argument);
    if (argument === "--timeout-ms") options.timeoutMs = parseInteger(value, argument);
    if (argument === "--retries") options.retries = parseInteger(value, argument);
    if (argument === "--output") options.output = value;
  }
  if (options.dryRun && options.output) throw new Error("--dry-run cannot be combined with --output.");
  if (!options.dryRun && !options.output) throw new Error(`Use --dry-run or provide --output inside .akashic-local/freshness/observations/.\n${usage()}`);
  if (options.changedSince && !/^(?!-)[A-Za-z0-9._/-]+$/.test(options.changedSince)) throw new Error("--changed-since must be a simple Git ref or commit SHA.");
  if (options.shardCount < 1 || options.shardCount > 256) throw new Error("--shard-count must be between 1 and 256.");
  if (options.shardIndex < 0 || options.shardIndex >= options.shardCount) throw new Error("--shard-index must identify a shard inside --shard-count.");
  if (options.concurrency < 1 || options.concurrency > 32) throw new Error("--concurrency must be between 1 and 32.");
  if (options.domainDelayMs < 0 || options.domainDelayMs > 60_000) throw new Error("--domain-delay-ms must be between 0 and 60000.");
  if (options.timeoutMs < 1 || options.timeoutMs > 60_000) throw new Error("--timeout-ms must be between 1 and 60000.");
  if (![0, 1].includes(options.retries)) throw new Error("--retries must be 0 or 1 so observation batches stay within five attempts.");
  return options;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function changedDiff(root, reference) {
  if (!reference) return null;
  const commit = execFileSync("git", ["rev-parse", "--verify", `${reference}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
  return execFileSync("git", ["diff", "--unified=0", "--no-ext-diff", `${commit}...HEAD`, "--", "lists", "atlas/places"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function summary({ options, targets, bundle, output }) {
  return {
    schemaVersion: 1,
    mode: options.dryRun ? "plan-only" : "network-observation",
    selection: {
      changedSince: options.changedSince || null,
      shardIndex: options.shardIndex,
      shardCount: options.shardCount,
      resourceCount: targets.length,
    },
    policy: {
      concurrency: options.concurrency,
      domainDelayMs: options.domainDelayMs,
      timeoutMs: options.timeoutMs,
      retries: options.retries,
      methodOrder: ["HEAD", "GET-fallback"],
      responseBodiesPersisted: false,
    },
    observedAt: bundle?.observedAt || null,
    output,
    notices: [
      "Observations are review evidence only; they do not prove descriptions are current.",
      "The scanner did not edit, delete, or rewrite catalog resources.",
    ],
  };
}

async function main() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  const output = options.output ? path.resolve(options.output) : null;
  const privateRoot = path.join(root, ".akashic-local", "freshness", "observations");
  if (output && !isWithin(privateRoot, output)) throw new Error("Freshness observations must stay under .akashic-local/freshness/observations/.");
  const index = await loadRepositoryResourceIndex(root);
  const targets = selectFreshnessTargets({
    index,
    changedDiff: changedDiff(root, options.changedSince),
    shardIndex: options.shardIndex,
    shardCount: options.shardCount,
  });
  if (options.dryRun || !targets.length) {
    process.stdout.write(`${JSON.stringify(summary({ options, targets, bundle: null, output: null }), null, 2)}\n`);
    return;
  }
  const throttle = createDomainThrottle({ delayMs: options.domainDelayMs });
  const transport = createFreshnessTransport({ throttle });
  const bundle = await scanFreshnessTargets({
    index,
    targets,
    transport,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
    retries: options.retries,
    githubToken: process.env.GITHUB_TOKEN || "",
  });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(summary({ options, targets, bundle, output: path.relative(root, output) }), null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
