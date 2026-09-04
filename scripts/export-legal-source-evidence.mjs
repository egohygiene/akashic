#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createAetherLegalSourceEvidencePacket, formatAetherLegalSourceEvidencePacket, verifyAetherPacketAttachmentBytes } from "./lib/legal-source-export.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultContract = path.join(root, "research", "legal", "aether-public-evidence-v1.lock.json");
const usage = `Usage: node scripts/export-legal-source-evidence.mjs --manifest <path> [--snapshot <id>] [--destination <scope>] [--contract <path>] [--format <text|json>]

Builds and validates one deterministic Aether public-evidence packet on standard output. It performs no network requests, file writes, transport, or capability grants.
`;

function parseOptions(argumentsList) {
  const options = { contract: defaultContract, destination: "egohygiene/realm#25", format: "text", help: false, manifest: null, snapshot: null };
  const values = new Map([
    ["--contract", "contract"],
    ["--destination", "destination"],
    ["--format", "format"],
    ["--manifest", "manifest"],
    ["--snapshot", "snapshot"],
  ]);
  const seen = new Set();
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help") {
      options.help = true;
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
  if (!options.help && !options.manifest) throw new Error("--manifest is required.");
  if (!new Set(["json", "text"]).has(options.format)) throw new Error("--format must be text or json.");
  return options;
}

function resolveLegalJson(value) {
  const resolved = path.resolve(process.cwd(), value);
  const legalRoot = path.join(root, "research", "legal");
  const relative = path.relative(legalRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(relative) !== ".json") throw new Error("Legal source export inputs must be JSON files inside research/legal.");
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
  const [manifest, contractLock, jurisdictions] = await Promise.all([
    readJson(resolveLegalJson(options.manifest)),
    readJson(resolveLegalJson(options.contract)),
    readJson(path.join(root, "atlas", "jurisdictions.json")),
  ]);
  const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
  const packet = await createAetherLegalSourceEvidencePacket(manifest, contractLock, {
    destinationScope: [options.destination],
    jurisdictionById,
    root,
    snapshotId: options.snapshot,
  });
  await verifyAetherPacketAttachmentBytes(packet, { root });
  process.stdout.write(options.format === "json" ? `${JSON.stringify(packet, null, 2)}\n` : formatAetherLegalSourceEvidencePacket(packet));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
