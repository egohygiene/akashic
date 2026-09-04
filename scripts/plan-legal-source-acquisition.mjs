import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLegalSourceAcquisitionPlan, formatLegalSourceAcquisitionPlan } from "./lib/legal-source-acquisition.mjs";
import { validateLegalSourceSnapshotManifest } from "./lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const usage = `Usage: node scripts/plan-legal-source-acquisition.mjs --manifest <path> [--observation <path>] [--format <text|json>]

Builds a deterministic, read-only acquisition plan. It performs no network requests, file writes, or manifest mutations.
`;

function parseOptions(argumentsList) {
  const options = { format: "text", help: false, manifest: "", observation: "" };
  const seen = new Set();
  const valueOptions = new Map([
    ["--format", "format"],
    ["--manifest", "manifest"],
    ["--observation", "observation"],
  ]);
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    const option = valueOptions.get(argument);
    if (!option) throw new Error(`Unsupported argument: ${argument}.`);
    if (seen.has(argument)) throw new Error(`${argument} may be supplied only once.`);
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    seen.add(argument);
    options[option] = value;
    index += 1;
  }
  if (!options.help && !options.manifest) throw new Error("--manifest is required.");
  if (!new Set(["json", "text"]).has(options.format)) throw new Error("--format must be text or json.");
  return options;
}

function resolveLegalPath(value) {
  const resolved = path.resolve(process.cwd(), value);
  const legalRoot = path.join(root, "research", "legal");
  const relative = path.relative(legalRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(relative) !== ".json") throw new Error("Legal source planner inputs must be JSON files inside research/legal.");
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
  const manifestPath = resolveLegalPath(options.manifest);
  const [manifest, jurisdictionManifest, observation] = await Promise.all([
    readJson(manifestPath),
    readJson(path.join(root, "atlas", "jurisdictions.json")),
    options.observation ? readJson(resolveLegalPath(options.observation)) : null,
  ]);
  const jurisdictionById = new Map(jurisdictionManifest.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
  await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  const plan = createLegalSourceAcquisitionPlan(manifest, observation);
  process.stdout.write(options.format === "json" ? `${JSON.stringify(plan, null, 2)}\n` : formatLegalSourceAcquisitionPlan(plan));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
