#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLegalSourcePackRefreshReport, formatLegalSourcePackRefreshReport, validateLegalSourcePack } from "./lib/legal-source-packs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return "Usage: node scripts/refresh-legal-source-pack.mjs --baseline \"research/legal/packs/<pack>.json\" --candidate \"research/legal/packs/<pack>.json\" --as-of \"YYYY-MM-DD\" [--format \"json|text\"]";
}

function parseArguments(argv) {
  const options = { asOf: null, baselinePath: null, candidatePath: null, format: "text" };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`${usage()}\nMissing value for ${flag}.`);
    if (flag === "--baseline") options.baselinePath = value;
    else if (flag === "--candidate") options.candidatePath = value;
    else if (flag === "--as-of") options.asOf = value;
    else if (flag === "--format") options.format = value;
    else throw new Error(`${usage()}\nUnknown option: ${flag}.`);
  }
  if (!options.baselinePath || !options.candidatePath || !options.asOf || !["json", "text"].includes(options.format)) throw new Error(usage());
  return options;
}

async function readJson(relativePath) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Input path escapes the repository.");
  return JSON.parse(await readFile(resolved, "utf8"));
}

try {
  const options = parseArguments(process.argv.slice(2));
  const [baseline, candidate, jurisdictions] = await Promise.all([
    readJson(options.baselinePath),
    readJson(options.candidatePath),
    readJson("atlas/jurisdictions.json"),
  ]);
  const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
  await validateLegalSourcePack(baseline, { jurisdictionById, root });
  await validateLegalSourcePack(candidate, { jurisdictionById, root });
  const report = createLegalSourcePackRefreshReport(baseline, candidate, { asOf: options.asOf });
  process.stdout.write(options.format === "json" ? `${JSON.stringify(report, null, 2)}\n` : formatLegalSourcePackRefreshReport(report));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
