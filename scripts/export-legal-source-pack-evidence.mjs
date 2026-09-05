#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAetherLegalSourcePackEvidencePacket, formatAetherLegalSourcePackEvidencePacket } from "./lib/legal-source-pack-export.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return "Usage: node scripts/export-legal-source-pack-evidence.mjs --pack \"research/legal/packs/<pack>.json\" [--destination \"owner/repo#issue\"] [--format \"json|text\"]";
}

function parseArguments(argv) {
  const options = { destinations: [], format: "text", packPath: null };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`${usage()}\nMissing value for ${flag}.`);
    if (flag === "--pack") options.packPath = value;
    else if (flag === "--destination") options.destinations.push(value);
    else if (flag === "--format") options.format = value;
    else throw new Error(`${usage()}\nUnknown option: ${flag}.`);
  }
  if (!options.packPath || !["json", "text"].includes(options.format)) throw new Error(usage());
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
  const [pack, contractLock, jurisdictions] = await Promise.all([
    readJson(options.packPath),
    readJson("research/legal/aether-public-evidence-v1.lock.json"),
    readJson("atlas/jurisdictions.json"),
  ]);
  const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
  const packet = await createAetherLegalSourcePackEvidencePacket(pack, contractLock, {
    destinationScope: options.destinations.length ? [...new Set(options.destinations)].sort() : undefined,
    jurisdictionById,
    packPath: options.packPath,
    root,
  });
  process.stdout.write(options.format === "json" ? `${JSON.stringify(packet, null, 2)}\n` : formatAetherLegalSourcePackEvidencePacket(packet));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
