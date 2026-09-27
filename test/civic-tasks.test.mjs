import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCivicPage, CIVIC_SOURCE, parseCivicMarkdown, renderCivicHub, validateCivicTasks } from "../scripts/lib/civic-tasks.mjs";

const markdown = await readFile(new URL(`../${CIVIC_SOURCE}`, import.meta.url), "utf8");
const chapter = parseCivicMarkdown(markdown, { locationIds: new Set(["us-ma"]) });
const copy = () => structuredClone(chapter.tasks);

test("civic cards preserve readable Markdown, source provenance, and no-JS navigation", () => {
  const html = renderCivicHub(chapter);
  assert.equal(chapter.tasks.length, 24);
  assert.equal((html.match(/<details open>/g) || []).length, chapter.tasks.length);
  for (const task of chapter.tasks) {
    assert.ok(html.includes(`id="${task.id}"`));
    assert.ok(task.source_urls.length > 0);
    assert.equal(task.human_review, "pending");
  }
  assert.match(html, /href="#replace-license">/);
  assert.doesNotMatch(html, /href="#[^"]+" target=/);
  assert.match(html, /id="i-moved-checklist"/);
  assert.match(html, /Human review pending/);
});

test("private case fields and unknown vocabulary are rejected", () => {
  for (const [key, value] of [["progress", "done"], ["license_number", "synthetic"], ["channels", ["email"]], ["privacy", "private-case"]]) {
    const tasks = copy();
    tasks[0][key] = value;
    assert.throws(() => validateCivicTasks(tasks));
  }
});

test("verification dates are real dates and never imply human review", () => {
  for (const date of ["2026-02-30", "2026-13-01", "yesterday"]) {
    const tasks = copy();
    tasks[0].last_verified_at = date;
    assert.throws(() => validateCivicTasks(tasks), /calendar date/);
  }
  const tasks = copy();
  tasks[0].review_due_at = tasks[0].last_verified_at;
  assert.throws(() => validateCivicTasks(tasks), /deadline/);
  tasks[0].review_due_at = "2026-10-27";
  tasks[0].human_review = "reviewed";
  assert.throws(() => validateCivicTasks(tasks), /own date/);
  tasks[0].human_reviewed_at = "2026-09-26";
  assert.throws(() => validateCivicTasks(tasks), /predates/);
  tasks[0].human_reviewed_at = "2026-09-27";
  assert.doesNotThrow(() => validateCivicTasks(tasks));
});

test("missing operational rows and detached source lists fail closed", () => {
  const tasks = copy();
  delete tasks[0].fields.interim_proof;
  assert.throws(() => validateCivicTasks(tasks), /missing interim_proof/);
  const unsourced = copy();
  unsourced[0].fields.fee = "A guessed price.";
  assert.throws(() => validateCivicTasks(unsourced), /missing adjacent source/);
  const detached = copy();
  detached[0].source_urls.push("https://example.gov/unreferenced");
  assert.throws(() => validateCivicTasks(detached), /derived from the card/);
});

test("task graphs reject duplicate IDs, broken references, self-links, and prerequisite cycles", () => {
  const duplicate = copy();
  duplicate.push(structuredClone(duplicate[0]));
  assert.throws(() => validateCivicTasks(duplicate), /duplicate task ID/);
  for (const target of ["missing-task", chapter.tasks[0].id]) {
    const tasks = copy();
    tasks[0].follow_up = [target];
    assert.throws(() => validateCivicTasks(tasks), /invalid follow_up/);
  }
  const cycle = copy();
  cycle[0].prerequisites = [cycle[1].id];
  cycle[1].prerequisites = [cycle[0].id];
  assert.throws(() => validateCivicTasks(cycle), /prerequisite cycle/);
  assert.throws(() => validateCivicTasks(copy(), { locationIds: new Set(["us-ca"]) }), /unknown jurisdiction/);
});

test("Markdown parsing rejects damaged markers, dropped prose, duplicate rows, and broken anchors", () => {
  assert.throws(() => parseCivicMarkdown(markdown.replace("<!-- civic-task:end -->", "")), /markers/);
  assert.throws(() => parseCivicMarkdown(`${markdown}\nInvisible extra prose.`), /unparsed content/);
  assert.throws(() => parseCivicMarkdown(markdown.replace("| Check | Action |", "| Check | Action |\n| First check | extra |")), /duplicate row/);
  assert.throws(() => parseCivicMarkdown(markdown.replace("| Done when |", "| Missing row |")), /unknown or duplicate row/);
  assert.throws(() => parseCivicMarkdown(markdown.replace("## Change address", "## Changed title")), /unparsed card content|anchor/);
  assert.throws(() => parseCivicMarkdown(markdown.replace("(#i-moved-checklist)", "(#missing-checklist)")), /broken local link/);
  assert.throws(() => parseCivicMarkdown(markdown.replace("## Change address", "Unrendered prose.\n\n## Change address")), /unparsed card content/);
});

test("source-derived HTML escapes markup and rejects unsafe link schemes and credentials", () => {
  const tasks = copy();
  tasks[0].fields.first_check = '<script>alert("synthetic")</script>';
  const html = renderCivicHub({ ...chapter, tasks });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  tasks[0].fields.first_check = "[unsafe](javascript:alert)";
  assert.throws(() => validateCivicTasks(tasks), /Unsupported collection-guide link/);
  const credentialUrl = copy();
  credentialUrl[0].source_urls[0] = "https://user:secret@example.gov/";
  assert.throws(() => validateCivicTasks(credentialUrl), /credential-free/);
});

test("page generation is deterministic and refuses a missing or repeated insertion point", () => {
  const template = '<html lang="en"><!-- civic-hub --></html>';
  assert.equal(buildCivicPage(template, chapter), buildCivicPage(template, chapter));
  assert.throws(() => buildCivicPage("<html></html>", chapter), /exactly one/);
  assert.throws(() => buildCivicPage(`${template}${template}`, chapter), /exactly one/);
});
