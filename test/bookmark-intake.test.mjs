import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createBookmarkIntakeReport, loadRepositoryResourceIndex, parseBookmarkExport } from "../scripts/lib/bookmark-intake.mjs";

const fixture = (name) => readFile(new URL(`./fixtures/bookmark-intake/${name}`, import.meta.url), "utf8");

test("parses Netscape exports while retaining local folder and label context", async () => {
  const content = await fixture("malicious-netscape.fixture.html");
  const parsed = parseBookmarkExport(content);
  assert.equal(parsed.format, "netscape-html");
  assert.equal(parsed.bookmarks.length, 6);
  assert.deepEqual(parsed.bookmarks[0], {
    title: "Example research",
    url: "https://www.example.com/path/?utm_source=mail&lang=en#notes",
    folders: ["Personal Research"],
    labels: ["later", "reading"],
  });
});

test("parses Chrome and Firefox JSON trees", async () => {
  const chrome = parseBookmarkExport(await fixture("chrome.fixture.json"));
  assert.deepEqual(chrome.bookmarks[0].folders, ["Bookmarks bar", "Projects"]);
  assert.equal(chrome.bookmarks[0].title, "Akashic");

  const firefox = parseBookmarkExport(await fixture("firefox.fixture.json"));
  assert.deepEqual(firefox.bookmarks[0].folders, ["root", "Reference"]);
  assert.deepEqual(firefox.bookmarks[0].labels, ["reference", "web"]);
});

test("builds an offline, resumable report without echoing rejected URLs", async () => {
  const content = await fixture("malicious-netscape.fixture.html");
  const parsed = parseBookmarkExport(content);
  const index = {
    resources: [{ id: "existing", title: "Existing", url: "https://example.com/path?lang=en#notes", source: "lists/example/README.md", kind: "catalog" }],
    currentByIdentity: new Map([["example.com/path?lang=en#notes", [{ id: "existing", title: "Existing", url: "https://example.com/path?lang=en#notes", source: "lists/example/README.md", kind: "catalog" }]]]),
    aliasByIdentity: new Map(),
    nearByIdentity: new Map(),
    byTitle: new Map(),
  };
  const report = createBookmarkIntakeReport({ content, format: parsed.format, bookmarks: parsed.bookmarks, index, limit: 1 });
  assert.equal(report.totals.parsed, 6);
  assert.equal(report.totals.rejected, 5);
  assert.equal(report.totals.reviewable, 1);
  assert.equal(report.candidates[0].classification, "duplicate");
  assert.equal(report.candidates[0].url, "https://www.example.com/path?lang=en#notes");
  assert.deepEqual(report.candidates[0].removedTrackingParameters, ["utm_source"]);
  assert.equal(report.batch.nextOffset, null);
  assert.equal(report.rejected.count, 5);
  assert.match(report.catalog.sha256, /^[a-f0-9]{64}$/);
  const serialized = JSON.stringify(report.rejected.sample);
  assert.doesNotMatch(serialized, /super-secret|password@example|127\.0\.0\.1|chrome:\/\//);
});

test("indexes current URLs and aliases from every list and Atlas place file", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const index = await loadRepositoryResourceIndex(root);
  assert.ok(index.resources.length > 5_000);
  assert.ok(index.resources.some((resource) => resource.kind === "catalog"));
  assert.ok(index.resources.some((resource) => resource.kind === "atlas"));
  assert.ok(index.currentByIdentity.size > 5_000);
  assert.ok(index.aliasByIdentity instanceof Map);
});

test("classifies reviewed former URLs as redirects", () => {
  const content = JSON.stringify({ children: [{ title: "Old home", uri: "https://old.example.com/start" }] });
  const parsed = parseBookmarkExport(content);
  const match = { id: "new-home", title: "New home", url: "https://example.com/", source: "lists/example/README.md", kind: "catalog" };
  const index = {
    resources: [match],
    currentByIdentity: new Map(),
    aliasByIdentity: new Map([["old.example.com/start", [match]]]),
    nearByIdentity: new Map(),
    byTitle: new Map(),
  };
  const report = createBookmarkIntakeReport({ content, format: parsed.format, bookmarks: parsed.bookmarks, index });
  assert.equal(report.candidates[0].classification, "redirected");
  assert.deepEqual(report.candidates[0].reasons, ["catalog-alias"]);
});

test("CLI dry runs expose only a summary and refuse public report paths", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "akashic-bookmarks-"));
  try {
    const input = path.join(temporaryDirectory, "export.json");
    await writeFile(input, JSON.stringify({ children: [{ title: "Private label", uri: "https://example.com/" }] }));
    const dryRun = spawnSync(process.execPath, ["scripts/import-bookmarks.mjs", "--input", input, "--dry-run"], { cwd: root, encoding: "utf8" });
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.doesNotMatch(dryRun.stdout, /Private label|example\.com/);
    assert.equal(JSON.parse(dryRun.stdout).totals.parsed, 1);

    const unsafeOutput = spawnSync(process.execPath, ["scripts/import-bookmarks.mjs", "--input", input, "--output", "report.json"], { cwd: root, encoding: "utf8" });
    assert.equal(unsafeOutput.status, 1);
    assert.match(unsafeOutput.stderr, /must stay under \.akashic-local\/bookmark-intake/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
