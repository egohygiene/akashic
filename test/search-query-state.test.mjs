import assert from "node:assert/strict";
import test from "node:test";
import {
  createSearchShareUrl,
  readSharedSearchQuery,
  sharedSearchAnchor,
} from "../site/search-query-state.js";

test("shared search links keep queries in a fragment outside the HTTP request", () => {
  const shared = createSearchShareUrl(
    "https://akashic.egohygiene.io/?collection=awesome-legal&view=cards&q=legacy#top",
    "  I received a court paper Friday  ",
  );
  const url = new URL(shared);

  assert.equal(url.searchParams.get("collection"), "awesome-legal");
  assert.equal(url.searchParams.get("view"), "cards");
  assert.equal(url.searchParams.has("q"), false);
  assert.equal(url.hash, "#catalog?q=I+received+a+court+paper+Friday");
  assert.equal(readSharedSearchQuery(url.search, url.hash), "I received a court paper Friday");
  assert.equal(sharedSearchAnchor(url.hash), "#catalog");
});

test("fragment queries take precedence while legacy query links remain readable", () => {
  assert.equal(readSharedSearchQuery("?q=legacy+question", "#catalog?q=fragment+question"), "fragment question");
  assert.equal(readSharedSearchQuery("?q=legacy+question", "#catalog"), "legacy question");
  assert.equal(readSharedSearchQuery("", "#catalog"), "");
});

test("an empty explicit share produces an ordinary catalog anchor", () => {
  const shared = createSearchShareUrl("https://akashic.egohygiene.io/?view=list&q=legacy#top", "  ");
  const url = new URL(shared);

  assert.equal(url.search, "?view=list");
  assert.equal(url.hash, "#catalog");
});
