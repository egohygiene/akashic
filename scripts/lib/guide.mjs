import path from "node:path";

export const SITE_GUIDE_START = "<!-- site-guide:start -->";
export const SITE_GUIDE_END = "<!-- site-guide:end -->";

const REPOSITORY_BLOB_ROOT = "https://github.com/egohygiene/akashic/blob/main/";

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function guideHref(href, source) {
  if (href.startsWith("https://")) return href;
  if (href.startsWith("#")) return `${REPOSITORY_BLOB_ROOT}${source}${href}`;
  if (/^(?:\.\.?\/)/.test(href)) {
    const [relativePath, hash = ""] = href.split("#", 2);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), relativePath));
    if (resolved.startsWith("../") || !resolved.endsWith(".md")) throw new Error(`Unsafe collection-guide link in ${source}: ${href}`);
    return `${REPOSITORY_BLOB_ROOT}${resolved}${hash ? `#${hash}` : ""}`;
  }
  throw new Error(`Unsupported collection-guide link in ${source}: ${href}`);
}

function renderInline(markdown, source) {
  const links = [];
  const withTokens = markdown.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_, label, href) => {
    const token = `AKASHICGUIDELINK${links.length}TOKEN`;
    links.push(`<a href="${escapeHtml(guideHref(href.trim(), source))}" target="_blank" rel="noreferrer">${escapeHtml(label.trim())}<span class="sr-only"> (opens in a new tab)</span></a>`);
    return token;
  });
  let html = escapeHtml(withTokens)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  links.forEach((link, index) => { html = html.replace(`AKASHICGUIDELINK${index}TOKEN`, link); });
  return html;
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function renderTable(lines, start, source) {
  const headings = tableCells(lines[start]);
  const rows = [];
  let cursor = start + 2;
  while (cursor < lines.length && /^\s*\|/.test(lines[cursor])) {
    rows.push(tableCells(lines[cursor]));
    cursor += 1;
  }
  const head = headings.map((cell) => `<th scope="col">${renderInline(cell, source)}</th>`).join("");
  const body = rows.map((row) => `<tr>${headings.map((_, index) => `<td>${renderInline(row[index] || "", source)}</td>`).join("")}</tr>`).join("");
  return { html: `<div class="guide-table-wrap" tabindex="0"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`, next: cursor };
}

export function renderGuideMarkdown(markdown, source) {
  const withoutContents = markdown.replace(/^## Contents\s*$[\s\S]*?(?=^##\s)/m, "").trim();
  const lines = withoutContents.split("\n");
  const blocks = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (!line.trim()) {
      cursor += 1;
      continue;
    }
    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      const level = heading[1] === "##" ? 3 : 4;
      blocks.push(`<h${level}>${renderInline(heading[2].trim(), source)}</h${level}>`);
      cursor += 1;
      continue;
    }
    if (/^\s*\|/.test(line) && cursor + 1 < lines.length && /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[cursor + 1])) {
      const table = renderTable(lines, cursor, source);
      blocks.push(table.html);
      cursor = table.next;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (cursor < lines.length && /^>\s?/.test(lines[cursor])) {
        quote.push(lines[cursor].replace(/^>\s?/, "").trim());
        cursor += 1;
      }
      blocks.push(`<aside class="guide-warning">${renderInline(quote.join(" "), source)}</aside>`);
      continue;
    }
    const listMatch = line.match(/^(?:- |\d+\. )/);
    if (listMatch) {
      const ordered = /^\d+\. /.test(line);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^-\s+(.+)$/;
      while (cursor < lines.length) {
        const item = lines[cursor].match(pattern);
        if (!item) break;
        items.push(`<li>${renderInline(item[1].trim(), source)}</li>`);
        cursor += 1;
      }
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    const paragraph = [line.trim()];
    cursor += 1;
    while (cursor < lines.length && lines[cursor].trim() && !/^(?:##|###|>\s?|\s*\||- |\d+\. )/.test(lines[cursor])) {
      paragraph.push(lines[cursor].trim());
      cursor += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "), source)}</p>`);
  }
  return blocks.join("");
}

export function parseSiteGuide(markdown, source) {
  const starts = markdown.split(SITE_GUIDE_START).length - 1;
  const ends = markdown.split(SITE_GUIDE_END).length - 1;
  if (starts !== ends || starts > 1) throw new Error(`Collection-guide markers are unbalanced in ${source}.`);
  if (!starts) return null;
  const start = markdown.indexOf(SITE_GUIDE_START) + SITE_GUIDE_START.length;
  const end = markdown.indexOf(SITE_GUIDE_END, start);
  const body = markdown.slice(start, end).trim();
  if (!body) throw new Error(`Collection guide is empty in ${source}.`);
  const html = renderGuideMarkdown(body, source);
  if (!html.includes("<h3>") || !html.includes("guide-warning")) throw new Error(`Collection guide needs orientation and safety content in ${source}.`);
  return { source, html };
}

export function parseRelatedPaths(markdown, source) {
  const section = markdown.match(/^## Related Akashic Collections\s*$([\s\S]*?)(?=^##\s|$(?![\s\S]))/m)?.[1] || "";
  const related = [];
  const seen = new Set();
  for (const match of section.matchAll(/\[([^\]]+)]\(([^)]+README\.md(?:#[^)]+)?)\)/g)) {
    const [relativePath, hash = ""] = match[2].split("#", 2);
    if (!/^(?:\.\.?\/)/.test(relativePath)) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), relativePath));
    const parts = resolved.split("/");
    if (parts[0] !== "lists" || parts.at(-1) !== "README.md" || parts.length < 3) continue;
    const categorySlug = parts[1];
    const groupSlug = parts.length > 3 ? parts[2] : "";
    const key = `${categorySlug}\u0000${groupSlug}\u0000${hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    related.push({ title: match[1].trim(), categorySlug, groupSlug, sectionHash: hash });
  }
  return related;
}
