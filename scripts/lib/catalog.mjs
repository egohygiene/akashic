export const CATEGORY_IDENTITIES = Object.freeze({
  "awesome-abundance": { color: "#d1459f", glyph: "✦" },
  "artificial-intelligence": { color: "#7656d8", glyph: "⌘" },
  "business-and-entrepreneurship": { color: "#c4862d", glyph: "◫" },
  "commerce-and-marketplaces": { color: "#c74b6f", glyph: "◧" },
  "containers-and-cloud": { color: "#0b877f", glyph: "◌" },
  "creative-resources": { color: "#c9542d", glyph: "△" },
  "dark-web-deep-web-and-anonymous-networks": { color: "#39456e", glyph: "◑" },
  "design-systems-and-branding": { color: "#16827d", glyph: "◩" },
  "developer-tools": { color: "#508c32", glyph: "◇" },
  "gaming-ecosystem-and-preservation": { color: "#a5572c", glyph: "⊞" },
  "health-and-well-being": { color: "#2f72c4", glyph: "☼" },
  "legal-help-and-law": { color: "#2d7f91", glyph: "§" },
  neuroscience: { color: "#b23f91", glyph: "◎" },
  "open-source": { color: "#6847bd", glyph: "∞" },
  psychedelics: { color: "#087c76", glyph: "⚗" },
  "public-services-and-support": { color: "#bd4b2a", glyph: "◈" },
  "recipes-cooking-and-food-data": { color: "#a85f1f", glyph: "♨" },
  research: { color: "#4d8430", glyph: "⌁" },
  "research-funding-and-grants": { color: "#286bb8", glyph: "✺" },
  "scientific-research": { color: "#b23882", glyph: "⬡" },
  security: { color: "#6543b6", glyph: "◐" },
  "self-hosting-and-homelab": { color: "#08766f", glyph: "✧" },
  "spirituality-religion-and-occult": { color: "#b64827", glyph: "☿" },
  "tex-and-typesetting": { color: "#477c2d", glyph: "∑" },
  "travel-and-mobility": { color: "#3978c4", glyph: "⌖" },
  "web-development": { color: "#2867ad", glyph: "⌬" },
  "work-and-learning": { color: "#a9387c", glyph: "◒" },
});

export function collectionIdentity(slug, identities = CATEGORY_IDENTITIES) {
  const identity = identities[slug];
  if (!identity?.color || !identity?.glyph) throw new Error(`Top-level collection has no declared identity: ${slug}`);
  if (!/^#[0-9a-f]{6}$/i.test(identity.color)) throw new Error(`Top-level collection has an invalid color: ${slug}`);
  return identity;
}

export function parseRootCategories(markdown, identities = CATEGORY_IDENTITIES) {
  const categoryPattern = /^- \[([^\]]+)]\((lists\/([^/]+)\/README\.md)\) - (.+?) \*\*(\d[\d,]*) resources\.\*\*$/gm;
  return [...markdown.matchAll(categoryPattern)].map((match) => ({
    title: match[1],
    path: match[2],
    slug: match[3],
    description: match[4],
    declaredCount: Number(match[5].replaceAll(",", "")),
    ...collectionIdentity(match[3], identities),
  }));
}

export function parseResourceEntry(line, { extractLeadingLabels = false } = {}) {
  const entry = line.match(/^- \[([^\]]+)]\((https?:\/\/[^)]+)\) - (.+)$/);
  if (!entry) return null;
  let description = entry[3].trim();
  let accessLabels = [];
  if (extractLeadingLabels) {
    const labelBlock = description.match(/^\*\*([^*]+?)\.\*\*\s+(.+)$/);
    if (labelBlock) {
      accessLabels = labelBlock[1].split("·").map((label) => label.trim()).filter(Boolean);
      description = labelBlock[2].trim();
    }
  }
  return {
    title: entry[1].trim(),
    url: entry[2].trim(),
    description,
    accessLabels,
  };
}

export function normalizeUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const parameter of [...parsed.searchParams.keys()]) {
    if (/^(utm_|ref$|source$)/i.test(parameter)) parsed.searchParams.delete(parameter);
  }
  const normalizedPath = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.hostname.replace(/^www\./, "").toLocaleLowerCase()}${parsed.port ? `:${parsed.port}` : ""}${normalizedPath}${parsed.search}`;
}
