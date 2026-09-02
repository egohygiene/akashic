import assert from "node:assert/strict";
import test from "node:test";
import { migrateFavoriteTokens, parseFavoriteTokens } from "../site/favorites.js";

const resources = [{
  id: "stable-example",
  title: "Example",
  url: "https://new.example/path",
  aliases: ["https://www.old.example/path/"],
}];

test("migrates current and former favorite URLs to a stable resource ID", () => {
  assert.deepEqual([...migrateFavoriteTokens(resources, ["https://new.example/path/"])], ["stable-example"]);
  assert.deepEqual([...migrateFavoriteTokens(resources, ["https://old.example/path"])], ["stable-example"]);
  assert.deepEqual([...migrateFavoriteTokens(resources, ["stable-example"])], ["stable-example"]);
});

test("deduplicates migrated favorites and drops unknown tokens", () => {
  const migrated = migrateFavoriteTokens(resources, ["stable-example", "https://old.example/path", "https://missing.example/"]);
  assert.deepEqual([...migrated], ["stable-example"]);
});

test("parses only stored arrays of string tokens", () => {
  assert.deepEqual(parseFavoriteTokens('["one",3,"two"]'), ["one", "two"]);
  assert.equal(parseFavoriteTokens("{}"), null);
  assert.equal(parseFavoriteTokens("broken"), null);
});
