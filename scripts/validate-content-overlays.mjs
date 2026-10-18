import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createContentSources, validateContentOverlays } from "./lib/content-overlays.mjs";
import { loadLocales } from "./lib/i18n.mjs";
import { NEED_PATHS } from "../site/needs.js";

const root = process.cwd();
const options = { input: "localization/content-overlays-v1.json", output: "localization/review-report-v1.json", verify: false };
for (let index = 2; index < process.argv.length; index++) {
  const argument = process.argv[index];
  if (argument === "--verify") options.verify = true;
  else if (["--input", "--output"].includes(argument)) {
    const value = process.argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a file path.`);
    options[argument.slice(2)] = value;
  } else throw new Error(`Unknown content-overlay option: ${argument}`);
}

const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [document, catalog, atlas, locales] = await Promise.all([
  readJson(options.input),
  readJson("dist/data/catalog.json"),
  readJson("dist/data/atlas.json"),
  loadLocales(path.join(root, "site")),
]);
const sources = createContentSources({ catalog, atlas, needs: NEED_PATHS, englishMessages: locales.catalogs.get("en") });
const { published, report } = validateContentOverlays(document, { sources, locales });
const serialized = `${JSON.stringify(report, null, 2)}\n`;
const output = path.resolve(root, options.output);
if (options.verify) {
  if (await readFile(output, "utf8") !== serialized) throw new Error(`Content-overlay review report is out of date: ${options.output}. Regenerate it with node scripts/validate-content-overlays.mjs.`);
} else await writeFile(output, serialized);
console.log(`Content overlays: ${report.counts.total} entries; ${published.length} reviewed-current fields published; ${report.counts.draft} drafts; ${report.counts.stale} stale; ${report.counts.orphaned} orphaned; ${report.counts.withdrawn} withdrawn.`);
