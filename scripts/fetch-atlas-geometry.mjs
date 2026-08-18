import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputDirectory = path.join(process.cwd(), "site", "data", "geometry");
const sources = [
  {
    file: "countries-110m.json",
    url: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",
    sha256: "2516c915867c7baf18ddec727aec46c315541a07cfb3d79a6559b05d5e94eee8",
  },
  {
    file: "states-albers-10m.json",
    url: "https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json",
    sha256: "6e7bb086a3c791490361968a3094f377f7726c5d0c4900fec03cc42db2305a3d",
  },
];

await mkdir(outputDirectory, { recursive: true });
for (const source of sources) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Could not fetch ${source.url}: ${response.status}`);
  const content = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(content).digest("hex");
  if (digest !== source.sha256) throw new Error(`Checksum mismatch for ${source.file}: ${digest}`);
  const topology = JSON.parse(content);
  if (topology.type !== "Topology" || !topology.objects || !Array.isArray(topology.arcs)) {
    throw new Error(`${source.file} is not the expected TopoJSON topology.`);
  }
  await writeFile(path.join(outputDirectory, source.file), content);
  console.log(`Refreshed ${source.file}.`);
}
