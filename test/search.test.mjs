import assert from "node:assert/strict";
import test from "node:test";
import { compileSearchQuery, decomposeSearchQuery, normalizeSearchText, searchResources } from "../site/search/weighted-lexical-v2.js";

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

test("query decomposition records intent and explicit urgency without inventing a deadline", () => {
  const decomposition = decomposeSearchQuery("I have no money and my landlord says I need to leave Friday");
  assert.deepEqual(decomposition.intents, ["housing-risk", "no-income"]);
  assert.deepEqual(decomposition.urgency, {
    level: "deadline-sensitive",
    signals: [{ kind: "deadline", text: "friday" }],
  });
  assert.equal(decomposition.location, null);
  assert.deepEqual(decomposition.accessNeeds, [{ id: "no-cost", signals: ["no money"] }]);
  assert.deepEqual(decomposition.subqueries.slice(0, 3), [
    "no money landlord need leave friday",
    "housing or eviction help",
    "help with no income",
  ]);
  assert.equal(Object.hasOwn(decomposition.urgency, "deadline"), false);
});

test("query decomposition extracts explicit place and access constraints", () => {
  const decomposition = decomposeSearchQuery("I need free wheelchair-accessible transit near Wilmington, Massachusetts today without a car");
  assert.deepEqual(decomposition.intents, ["travel-without-car"]);
  assert.deepEqual(decomposition.urgency, {
    level: "immediate",
    signals: [{ kind: "immediate", text: "today" }],
  });
  assert.deepEqual(decomposition.location, {
    text: "Wilmington, Massachusetts",
    normalized: "wilmington massachusetts",
    source: "prepositional-span",
  });
  assert.deepEqual(decomposition.accessNeeds, [
    { id: "no-cost", signals: ["free"] },
    { id: "no-car", signals: ["without a car"] },
    { id: "mobility-accessible", signals: ["wheelchair"] },
  ]);
  assert.ok(decomposition.subqueries.length <= 6);
  assert.ok(decomposition.subqueries.includes("travel without a car free wheelchair accessible wilmington massachusetts"));
});

test("query decomposition keeps the longest explicit urgency signal", () => {
  assert.deepEqual(decomposeSearchQuery("I need help right now").urgency, {
    level: "immediate",
    signals: [{ kind: "immediate", text: "right now" }],
  });
});

test("query decomposition rejects a non-geographic in-phrase", () => {
  const decomposition = decomposeSearchQuery("I am in need of food today");
  assert.equal(decomposition.location, null);
  assert.equal(decomposition.urgency.level, "immediate");
  assert.deepEqual(decomposition.intents, ["food-today"]);
  assert.equal(decomposeSearchQuery("I need help, please").location, null);
});

test("compiled queries expose deterministic decomposition without changing scoring inputs", () => {
  const compiled = compileSearchQuery("IRS EIN");
  assert.deepEqual(compiled.decomposition, {
    schemaVersion: 1,
    normalizedQuery: "irs ein",
    intents: ["irs-ein"],
    urgency: { level: "unspecified", signals: [] },
    location: null,
    accessNeeds: [],
    subqueries: ["irs ein"],
  });
  assert.deepEqual(compiled.originalTerms, ["irs", "ein"]);
});
