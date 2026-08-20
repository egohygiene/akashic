import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

if (process.argv.length > 2) throw new Error("The intelligence check accepts no arguments.");

const intelligenceDirectory = path.join(process.cwd(), "dist", "intelligence");
for (const relativePath of ["index.html", "styles.css", "explorer.js", "summary.json"]) {
  await access(path.join(intelligenceDirectory, relativePath));
}

const intelligence = JSON.parse(await readFile(path.join(intelligenceDirectory, "summary.json"), "utf8"));
if (intelligence.schema !== "egohygiene.repository-intelligence-dashboard/v3" || intelligence.schema_version !== 1) {
  throw new Error("The repository intelligence dashboard has an unsupported schema.");
}

console.log("Verified the repository intelligence dashboard bundle.");
