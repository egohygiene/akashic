#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyLegalSourceAcquisition,
  formatLegalSourceAcquisitionApply,
  prepareLegalSourceAcquisitionApply,
} from "./lib/legal-source-apply.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = `Usage: node scripts/apply-legal-source-acquisition.mjs --manifest <path> --observation <path> --request <path> [--format <text|json>] [--apply]

Previews a digest-bound legal-source manifest update without writing by default.
Pass --apply to create new immutable artifacts and atomically replace the manifest.
`;

function parseOptions(argumentsList) {
  const options = { apply: false, format: "text", help: false, manifest: null, observation: null, request: null };
  const values = new Map([
    ["--format", "format"],
    ["--manifest", "manifest"],
    ["--observation", "observation"],
    ["--request", "request"],
  ]);
  const seen = new Set();
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (argument === "--apply") {
      if (seen.has(argument)) throw new Error("--apply may be supplied only once.");
      seen.add(argument);
      options.apply = true;
      continue;
    }
    const option = values.get(argument);
    if (!option) throw new Error(`Unsupported argument: ${argument}.`);
    if (seen.has(argument)) throw new Error(`${argument} may be supplied only once.`);
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    seen.add(argument);
    options[option] = value;
    index += 1;
  }
  if (!options.help && (!options.manifest || !options.observation || !options.request)) throw new Error("--manifest, --observation, and --request are required.");
  if (!new Set(["json", "text"]).has(options.format)) throw new Error("--format must be text or json.");
  return options;
}

function resolveLegalJson(value) {
  const resolved = path.resolve(process.cwd(), value);
  const legalRoot = path.join(root, "research", "legal");
  const relative = path.relative(legalRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(relative) !== ".json") throw new Error("Legal source apply inputs must be JSON files inside research/legal.");
  return resolved;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function main(argumentsList = process.argv.slice(2)) {
  const options = parseOptions(argumentsList);
  if (options.help) {
    process.stdout.write(usage);
    return;
  }
  const manifestPath = resolveLegalJson(options.manifest);
  const [manifest, observation, request, jurisdictions] = await Promise.all([
    readJson(manifestPath),
    readJson(resolveLegalJson(options.observation)),
    readJson(resolveLegalJson(options.request)),
    readJson(path.join(root, "atlas", "jurisdictions.json")),
  ]);
  const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
  const result = options.apply
    ? await applyLegalSourceAcquisition(manifest, observation, request, { jurisdictionById, manifestPath, root })
    : (await prepareLegalSourceAcquisitionApply(manifest, observation, request, { jurisdictionById, root })).result;
  process.stdout.write(options.format === "json"
    ? `${JSON.stringify({ mode: options.apply ? "applied" : "preview", ...result }, null, 2)}\n`
    : formatLegalSourceAcquisitionApply(result, { applied: options.apply }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
