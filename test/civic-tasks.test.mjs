import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCivicPage, CIVIC_CHAPTERS, CIVIC_SOURCE, parseCivicMarkdown, renderCivicHub, validateCivicTasks } from "../scripts/lib/civic-tasks.mjs";

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

test("each chapter keeps its own fragments, source links, and printable checklist", async () => {
  for (const { source, checklist } of CIVIC_CHAPTERS) {
    const text = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
    const parsed = parseCivicMarkdown(text, { source, locationIds: new Set(["us", "us-ma"]) });
    const html = renderCivicHub(parsed);
    assert.equal(parsed.source, source);
    assert.ok(html.includes(`<section id="${checklist}" class="civic-checklist">`));
    assert.equal((html.match(/class="civic-checklist"/g) || []).length, 1);
    assert.equal((html.match(/<details open>/g) || []).length, parsed.tasks.length);
    assert.doesNotMatch(html, /href="#([^" ]+)" target=/);
    assert.ok(html.includes(`href="#${parsed.tasks[0].id}"`));
    assert.doesNotMatch(html, new RegExp(`href="https://github.com/egohygiene/akashic/blob/main/${source}#`));
    const otherSource = CIVIC_CHAPTERS.find((other) => other.source !== source).source;
    assert.ok(html.includes(`href="https://github.com/egohygiene/akashic/blob/main/${otherSource}"`));
    const checklistHeading = html.match(new RegExp(`<section id="${checklist}" class="civic-checklist"><h2>([^<]+)</h2>`))?.[1];
    assert.ok(checklistHeading);
    const renamedChecklist = text.replace(`## ${checklistHeading}`, "## Renamed checklist");
    assert.notEqual(renamedChecklist, text);
    assert.throws(() => parseCivicMarkdown(renamedChecklist, { source }), /broken local link|missing chapter section/);
  }
});

test("chapter templates keep reciprocal navigation and the shared private-by-default enhancement", async () => {
  for (const { source, page } of CIVIC_CHAPTERS) {
    const template = await readFile(new URL(`../site/${page}`, import.meta.url), "utf8");
    assert.ok(template.includes(`href="https://akashic.egohygiene.io/${page}"`));
    assert.ok(template.includes(`href="https://github.com/egohygiene/akashic/blob/main/${source}"`));
    for (const other of CIVIC_CHAPTERS.filter((config) => config.page !== page)) {
      assert.ok(template.includes(`href="./${other.page}"`));
    }
    assert.ok(template.includes('<meta name="referrer" content="no-referrer">'));
    assert.ok(template.includes('<link rel="stylesheet" href="./civic.css">'));
    assert.deepEqual([...template.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map((match) => match[1]), ["./civic.js"]);
    assert.equal((template.match(/<script\b/g) || []).length, 1);
    assert.doesNotMatch(template, /<(?:form|input|textarea|iframe)\b/i);
    assert.equal((template.match(/<!-- civic-hub -->/g) || []).length, 1);
  }
  const licensing = await readFile(new URL("../site/licensing.html", import.meta.url), "utf8");
  assert.ok(licensing.includes('href="./atlas.html?place=us-ma"'));
  assert.match(licensing, /Human legal review is pending/);
  assert.match(licensing, /does not determine eligibility, legal obligations, or permission to operate/);
});

test("chapter selection rejects unknown sources and missing router sections", () => {
  for (const source of ["../outside.md", "https://example.com/tasks.md", "docs/civic/unregistered.md"]) {
    assert.throws(() => parseCivicMarkdown(markdown, { source }), /unknown chapter source/);
    assert.throws(() => renderCivicHub({ ...chapter, source }), /unknown chapter source/);
  }
  assert.throws(() => parseCivicMarkdown(markdown.replace("## Start with intent", "## Renamed router")), /missing chapter section/);
});
