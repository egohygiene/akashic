import assert from "node:assert/strict";
import test from "node:test";
import { collectionIdentity, normalizeUrl, parseResourceEntry, parseRootCategories } from "../scripts/lib/catalog.mjs";

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
  });
  assert.equal(parseResourceEntry(line).description, "**Open · Browser.** Edits audio without installation.");
  assert.equal(parseResourceEntry("not a resource"), null);
});

test("normalizes URL identity without erasing meaningful query parameters", () => {
  assert.equal(
    normalizeUrl("https://www.Example.com/path/?utm_source=mail&lang=en#details"),
    "example.com/path?lang=en",
  );
  assert.equal(normalizeUrl("https://example.com/"), "example.com/");
});
