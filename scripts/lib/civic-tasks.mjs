import { readFileSync } from "node:fs";
import { renderGuideMarkdown } from "./guide.mjs";

export const CIVIC_SOURCE = "docs/civic/ma-rmv.md";
export const CIVIC_FIELDS = Object.freeze({
  first_check: "First check",
  record_change: "Record change",
  document: "New document",
  route: "Where and how",
  evidence: "Bring",
  fee: "Cost",
  timing: "Timing",
  interim_proof: "Interim proof",
  done_when: "Done when",
  escalation: "If blocked",
});
const schema = JSON.parse(readFileSync(new URL("../../schemas/civic-task-v1.schema.json", import.meta.url), "utf8"));
const BLOB_ROOT = "https://github.com/egohygiene/akashic/blob/main/";
const SOURCED_FIELDS = ["record_change", "document", "route", "evidence", "fee", "timing", "interim_proof", "escalation"];
const RELATIONS = { prerequisites: "First check if needed", follow_up: "Possible next steps", do_not_confuse_with: "Do not confuse with" };
const KEYWORDS = new Set(["$schema", "$id", "$defs", "$ref", "title", "description", "type", "const", "enum", "properties", "required", "additionalProperties", "items", "minItems", "uniqueItems", "minLength", "pattern", "format"]);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
const sourceUrls = (markdown) => [...new Set([...markdown.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]))];

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Civic tasks: ${message}`);
}

function validDate(value, context) {
  const date = new Date(`${value}T00:00:00Z`);
  requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value, `${context}: invalid calendar date.`);
}

// This intentionally supports only the checked-in v1 vocabulary, not arbitrary
// JSON Schema documents. Reject additions until their semantics are implemented.
function validateShape(value, definition, context) {
  for (const keyword of Object.keys(definition)) requireCondition(KEYWORDS.has(keyword), `unsupported schema keyword ${keyword}.`);
  if (definition.$ref) {
    const target = schema.$defs[definition.$ref.replace("#/$defs/", "")];
    requireCondition(definition.$ref.startsWith("#/$defs/") && target, "unsupported schema reference.");
    return validateShape(value, target, context);
  }
  if ("const" in definition) requireCondition(value === definition.const, `${context}: incorrect constant.`);
  if (definition.enum) requireCondition(definition.enum.includes(value), `${context}: unsupported value.`);
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (definition.type) requireCondition([definition.type].flat().includes(type), `${context}: incorrect type.`);
  if (type === "object") {
    for (const key of definition.required ?? []) requireCondition(Object.hasOwn(value, key), `${context}: missing ${key}.`);
    for (const key of Object.keys(value)) {
      requireCondition(definition.properties?.[key] || definition.additionalProperties !== false, `${context}: unexpected ${key}.`);
      if (definition.properties?.[key]) validateShape(value[key], definition.properties[key], `${context}.${key}`);
    }
  } else if (type === "array") {
    requireCondition(value.length >= (definition.minItems ?? 0), `${context}: not enough items.`);
    if (definition.uniqueItems) requireCondition(new Set(value.map((item) => JSON.stringify(item))).size === value.length, `${context}: duplicate items.`);
    value.forEach((item, index) => validateShape(item, definition.items, `${context}[${index}]`));
  } else if (type === "string") {
    requireCondition(value.trim().length >= (definition.minLength ?? 0), `${context}: empty text.`);
    if (definition.pattern) requireCondition(new RegExp(definition.pattern).test(value), `${context}: invalid format.`);
    if (definition.format === "date") validDate(value, context);
    else if (definition.format === "uri") {
      const url = new URL(value);
      requireCondition(url.protocol === "https:" && !url.username && !url.password, `${context}: expected credential-free HTTPS URL.`);
    } else requireCondition(!definition.format, `${context}: unsupported format.`);
  }
}

export function validateCivicTasks(tasks, { locationIds } = {}) {
  requireCondition(Array.isArray(tasks) && tasks.length > 0, "no task cards.");
  const byId = new Map();
  for (const task of tasks) {
    validateShape(task, schema, task.id || "task");
    requireCondition(!byId.has(task.id), `duplicate task ID ${task.id}.`);
    requireCondition(slug(task.title) === task.id, `${task.id}: heading must preserve its Markdown anchor.`);
    requireCondition(task.review_due_at > task.last_verified_at, `${task.id}: review deadline must follow verification.`);
    if (locationIds) requireCondition(locationIds.has(task.jurisdiction), `${task.id}: unknown jurisdiction.`);
    if (task.human_review === "reviewed") {
      requireCondition(task.human_reviewed_at !== null, `${task.id}: human review needs its own date.`);
      requireCondition(task.human_reviewed_at >= task.last_verified_at, `${task.id}: human review predates the current source check.`);
    } else requireCondition(task.human_reviewed_at === null, `${task.id}: pending review cannot claim a review date.`);
    for (const key of SOURCED_FIELDS) requireCondition(sourceUrls(task.fields[key]).length > 0, `${task.id}.${key}: missing adjacent source.`);
    const expectedSources = sourceUrls(Object.values(task.fields).join("\n"));
    requireCondition(JSON.stringify(task.source_urls) === JSON.stringify(expectedSources), `${task.id}: source URLs must be derived from the card.`);
    // Also reject unsafe Markdown links even when validating a generated record.
    Object.values(task.fields).forEach((text) => renderGuideMarkdown(text, CIVIC_SOURCE));
    byId.set(task.id, task);
  }
  for (const task of tasks) {
    for (const key of Object.keys(RELATIONS)) {
      for (const target of task[key]) requireCondition(target !== task.id && byId.has(target), `${task.id}: invalid ${key} target ${target}.`);
    }
  }
  const visited = new Set();
  function visit(id, pending = new Set()) {
    requireCondition(!pending.has(id), `prerequisite cycle at ${id}.`);
    if (visited.has(id)) return;
    const next = new Set([...pending, id]);
    byId.get(id).prerequisites.forEach((target) => visit(target, next));
    visited.add(id);
  }
  tasks.forEach((task) => visit(task.id));
  return tasks;
}

export function parseCivicMarkdown(markdown, options = {}) {
  const blocks = [...markdown.matchAll(/^<!-- civic-task: (.+) -->\n([\s\S]*?)^<!-- civic-task:end -->\s*$/gm)];
  const endCount = (markdown.match(/<!-- civic-task:end -->/g) || []).length;
  const startCount = (markdown.match(/<!-- civic-task:/g) || []).length - endCount;
  requireCondition(blocks.length === startCount && startCount === endCount && startCount > 0, "unbalanced task markers.");
  const introduction = markdown.slice(0, blocks[0].index).trim();
  requireCondition(introduction.startsWith("# "), "missing chapter title.");
  let cursor = blocks[0].index;
  const tasks = blocks.map((block) => {
    requireCondition(!markdown.slice(cursor, block.index).trim(), "unparsed content between task cards.");
    cursor = block.index + block[0].length;
    const metadata = JSON.parse(block[1]);
    const title = block[2].match(/^## (.+)$/m)?.[1];
    requireCondition(title, "task missing heading.");
    const rows = [...block[2].matchAll(/^\| ([^|]+) \| (.+) \|$/gm)];
    const fields = {};
    for (const [, label, value] of rows) {
      if (label === "Check" || label === "---") continue;
      const key = Object.keys(CIVIC_FIELDS).find((candidate) => CIVIC_FIELDS[candidate] === label);
      requireCondition(key && !Object.hasOwn(fields, key), `${metadata.id}: unknown or duplicate row ${label}.`);
      fields[key] = value;
    }
    // Derived fields cannot silently override values hidden in the metadata.
    for (const derived of ["title", "fields", "source_urls"]) requireCondition(!Object.hasOwn(metadata, derived), `${metadata.id}: ${derived} must be derived from Markdown.`);
    const relatedLabels = { prerequisites: "First check", follow_up: "Possible next steps", do_not_confuse_with: "Do not confuse with" };
    const related = Object.entries(relatedLabels).filter(([key]) => metadata[key]?.length).map(([key, label]) => `${label}: ${metadata[key].map((id) => `[${id.replaceAll("-", " ")}](#${id})`).join(", ")}`).join(". ");
    const expectedBody = `## ${title}\n\n| Check | Action |\n| --- | --- |\n${Object.entries(CIVIC_FIELDS).map(([key, label]) => `| ${label} | ${fields[key]} |`).join("\n")}\n\n${related ? `${related}.` : ""}`;
    requireCondition(block[2].trim() === expectedBody.trim(), `${metadata.id}: unparsed card content or related links disagree with metadata.`);
    return { ...metadata, title, fields, source_urls: sourceUrls(Object.values(fields).join("\n")) };
  });
  requireCondition(!markdown.slice(cursor).trim(), "unparsed content after task cards.");
  validateCivicTasks(tasks, options);
  const anchors = new Set([
    ...tasks.map((task) => task.id),
    ...[...introduction.matchAll(/^## (.+)$/gm)].map((match) => slug(match[1])),
  ]);
  for (const [, target] of markdown.matchAll(/\]\(#([^)]+)\)/g)) requireCondition(anchors.has(target), `broken local link #${target}.`);
  return { schemaVersion: 1, source: CIVIC_SOURCE, introduction, tasks };
}

function renderLocalMarkdown(markdown) {
  const html = renderGuideMarkdown(markdown, CIVIC_SOURCE);
  return html.replaceAll(`href="${BLOB_ROOT}${CIVIC_SOURCE}#`, 'href="#')
    .replace(/<a href="(#[^"]+)" target="_blank" rel="noreferrer">([\s\S]*?)<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/g, '<a href="$1">$2</a>');
}

export function renderCivicHub(chapter) {
  validateCivicTasks(chapter.tasks);
  const introduction = chapter.introduction.replace(/^# .+\n+/, "");
  const sections = introduction.split(/(?=^## )/m).map((section) => {
    const heading = section.match(/^## (.+)\n/);
    return heading
      ? `<section id="${slug(heading[1])}"><h2>${escapeHtml(heading[1])}</h2>${renderLocalMarkdown(section.slice(heading[0].length))}</section>`
      : renderLocalMarkdown(section);
  }).join("");
  const byId = new Map(chapter.tasks.map((task) => [task.id, task]));
  const cards = chapter.tasks.map((task) => {
    const relation = (key, label) => task[key].length ? `<p><strong>${label}:</strong> ${task[key].map((id) => `<a href="#${id}">${escapeHtml(byId.get(id).title)}</a>`).join(" · ")}</p>` : "";
    const relations = Object.entries(RELATIONS).filter(([key]) => key !== "prerequisites").map(([key, label]) => relation(key, label)).join("");
    const row = (key) => `<dt>${CIVIC_FIELDS[key]}</dt><dd>${renderLocalMarkdown(task.fields[key])}</dd>`;
    const essentials = ["fee", "timing"].map(row).join("");
    const fields = Object.keys(CIVIC_FIELDS).filter((key) => !["first_check", "fee", "timing"].includes(key)).map(row).join("");
    const review = task.human_review === "pending" ? "Human review pending" : `Human reviewed ${escapeHtml(task.human_reviewed_at)}`;
    return `<article class="civic-task" id="${task.id}" data-review-due="${task.review_due_at}">
<h2 tabindex="-1">${escapeHtml(task.title)}</h2>
<p class="civic-intent">${task.intents.map(escapeHtml).join(" · ")}</p>
<p class="civic-provenance">${escapeHtml(task.agency)} · ${escapeHtml(task.jurisdiction)} · Sources checked <time>${task.last_verified_at}</time> · ${review} · Review due <time>${task.review_due_at}</time></p>
<p class="civic-overdue" hidden>Review overdue. Recheck current official instructions before acting.</p>
<div class="civic-next"><strong>First check</strong>${renderLocalMarkdown(task.fields.first_check)}</div>
<dl class="civic-essentials">${essentials}</dl>${relation("prerequisites", RELATIONS.prerequisites)}
<details open><summary>Steps and completion</summary><p><strong>Official transaction:</strong> ${escapeHtml(task.transaction)}</p><p><strong>Channels:</strong> ${task.channels.map(escapeHtml).join(", ")}. Check restrictions below.</p><dl>${fields}</dl>${relations}</details>
<div class="civic-progress" hidden><label for="progress-${task.id}">My reminder for ${escapeHtml(task.title.toLowerCase())}</label><select id="progress-${task.id}" autocomplete="off"><option value="not-started">Not started</option><option value="waiting">Waiting</option><option value="blocked">Blocked</option><option value="done">Done</option></select><span class="civic-print-state">My reminder: <output>Not started</output></span></div>
<a class="civic-back" href="#start-with-intent">Back to task router</a>
</article>`;
  }).join("\n");
  return `${sections}<section aria-label="RMV task cards">${cards}</section>`;
}

export function buildCivicPage(template, chapter) {
  const marker = "<!-- civic-hub -->";
  requireCondition(template.split(marker).length === 2, "page needs exactly one hub marker.");
  return template.replace(marker, () => renderCivicHub(chapter));
}
