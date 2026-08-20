import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

if (process.argv.length > 2) throw new Error("The intelligence check accepts no arguments.");

const intelligenceDirectory = path.join(process.cwd(), "dist", "intelligence");
const expectedFiles = ["explorer.js", "index.html", "provenance.json", "styles.css", "summary.json"];
const generatedFiles = (await readdir(intelligenceDirectory, { withFileTypes: true }))
  .map((entry) => entry.name)
  .sort();

if (JSON.stringify(generatedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`The repository intelligence subtree has unexpected entries: ${generatedFiles.join(", ")}`);
}

const intelligence = JSON.parse(await readFile(path.join(intelligenceDirectory, "summary.json"), "utf8"));
if (intelligence.schema !== "egohygiene.repository-intelligence-dashboard/v3" || intelligence.schema_version !== 1) {
  throw new Error("The repository intelligence dashboard has an unsupported schema.");
}

const provenance = JSON.parse(await readFile(path.join(intelligenceDirectory, "provenance.json"), "utf8"));
if (
  provenance.schema !== "egohygiene.relay.repository-intelligence-provenance/v1"
  || provenance.schema_version !== 1
) {
  throw new Error("The repository intelligence provenance has an unsupported schema.");
}

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (
  intelligence.repository?.name !== "egohygiene/akashic"
  || intelligence.repository?.source_commit !== sourceCommit
) {
  throw new Error("The repository intelligence summary does not represent this Akashic revision.");
}

if (
  provenance.consumer?.repository !== "egohygiene/akashic"
  || provenance.consumer?.source_commit !== sourceCommit
  || provenance.consumer?.visibility !== "public"
) {
  throw new Error("The repository intelligence consumer provenance is inconsistent.");
}

if (
  provenance.generator?.name !== "egohygiene/relay/actions/repository-intelligence"
  || provenance.generator?.version !== "1.1.0"
  || provenance.generator?.repository !== "egohygiene/relay"
  || provenance.generator?.immutable !== true
  || provenance.generator?.source_ref !== provenance.generator?.source_commit
) {
  throw new Error("The repository intelligence generator provenance is not the immutable Relay v1.1 package.");
}

if (
  provenance.projection?.route !== "/intelligence/"
  || provenance.projection?.classification !== "public-safe"
  || provenance.projection?.deployment_authority !== "consumer"
) {
  throw new Error("The repository intelligence bundle is not approved for Akashic Pages composition.");
}

console.log("Verified the immutable, public-safe Relay v1.1 intelligence bundle for Akashic.");
