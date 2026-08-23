import assert from "node:assert/strict";
import test from "node:test";
import { compileSearchQuery, normalizeSearchText, searchResources } from "../site/search/weighted-lexical-v2.js";

const resource = (title, description, section = "General") => ({
  title,
  description,
  section,
  category: "Example",
  groupTitle: "Example",
  domain: "example.org",
});

test("weighted lexical search normalizes Unicode, punctuation, and stop words", () => {
  assert.equal(normalizeSearchText("  Café—CARE!  "), "cafe care");
  const compiled = compileSearchQuery("How can I find FOOD today?");
  assert.deepEqual(compiled.originalTerms, ["find", "food", "today"]);
  assert.equal(compiled.concepts[0].id, "food-today");
});

test("ordinary-language concepts retrieve and prioritize useful canonical vocabulary", () => {
  const resources = [
    resource("Food history archive", "Books about meals and agriculture."),
    resource("Emergency Food Assistance", "Find immediate food help and a local food bank.", "Start Here"),
    resource("Unrelated editor", "A software development tool."),
  ];
  const ranked = searchResources(resources, "I need food today");
  assert.equal(ranked[0].title, "Emergency Food Assistance");
  assert.equal(ranked.some((candidate) => candidate.title === "Unrelated editor"), false);
});

test("curated aliases preserve exact identifiers missing from display titles", () => {
  const resources = [
    resource("Federal Court Fee Waiver Forms", "Official applications to proceed without prepaying fees or costs."),
    resource("Court history", "Historical court records."),
  ];
  assert.equal(searchResources(resources, "AO 240")[0].title, "Federal Court Fee Waiver Forms");
});
