import assert from "node:assert/strict";
import test from "node:test";
import { collectionIdentity, parseRootCategories } from "../scripts/lib/catalog.mjs";
import { parseResourceEntry } from "../scripts/lib/resource-parser.mjs";

test("parses a root collection only when its visual identity is declared", () => {
  const markdown = "- [Business](lists/business/README.md) - Practical guidance. **1,234 resources.**";
  const identities = { business: { color: "#123abc", glyph: "◫" } };
  assert.deepEqual(parseRootCategories(markdown, identities), [{
    title: "Business",
    path: "lists/business/README.md",
    slug: "business",
    description: "Practical guidance.",
    declaredCount: 1234,
    color: "#123abc",
    glyph: "◫",
  }]);
  assert.throws(() => parseRootCategories(markdown, {}), /no declared identity/);
  assert.throws(() => collectionIdentity("business", { business: { color: "blue", glyph: "◫" } }), /invalid color/);
});

test("extracts structured access labels from the creative-tools convention", () => {
  const line = "- [AudioMass](https://audiomass.co/) - **Open · Browser.** Edits audio without installation.";
  assert.deepEqual(parseResourceEntry(line, { extractLeadingLabels: true }), {
    title: "AudioMass",
    url: "https://audiomass.co/",
    description: "Edits audio without installation.",
    accessLabels: ["Open", "Browser"],
    id: "audiomass-8691aee028",
    idOrigin: "derived",
    aliases: [],
    metadata: {},
  });
  assert.equal(parseResourceEntry(line).description, "**Open · Browser.** Edits audio without installation.");
  assert.equal(parseResourceEntry("not a resource"), null);
});
