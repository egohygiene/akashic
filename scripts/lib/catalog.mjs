export { parseResourceEntry } from "./resource-parser.mjs";
import { CATALOG_RESOURCE_FIELDS, decodeCatalog } from "../../site/catalog-data.js";

export const CATEGORY_IDENTITIES = Object.freeze({
  "awesome-abundance": { color: "#d1459f", glyph: "✦" },
  "artificial-intelligence": { color: "#7656d8", glyph: "⌘" },
  "business-and-entrepreneurship": { color: "#c4862d", glyph: "◫" },
  "claims-conspiracies-and-epistemic-navigation": { color: "#8b5a33", glyph: "∴" },
  "commerce-and-marketplaces": { color: "#c74b6f", glyph: "◧" },
  "containers-and-cloud": { color: "#0b877f", glyph: "◌" },
  "creative-resources": { color: "#c9542d", glyph: "△" },
  "cryptocurrency-and-digital-assets": { color: "#9a6723", glyph: "¤" },
  "dark-web-deep-web-and-anonymous-networks": { color: "#39456e", glyph: "◑" },
  "design-systems-and-branding": { color: "#16827d", glyph: "◩" },
  "developer-tools": { color: "#508c32", glyph: "◇" },
  "digital-forensics-and-incident-evidence": { color: "#8c4b75", glyph: "⌕" },
  "family-caregiving-and-aging": { color: "#a34c67", glyph: "♡" },
  "financial-relief-and-assistance": { color: "#357a5b", glyph: "◍" },
  "gaming-ecosystem-and-preservation": { color: "#a5572c", glyph: "⊞" },
  "hacking-and-cybersecurity": { color: "#a23f55", glyph: "⌾" },
  "health-and-well-being": { color: "#2f72c4", glyph: "☼" },
  "housing-home-and-utilities": { color: "#8a623b", glyph: "⌂" },
  "legal-help-and-law": { color: "#2d7f91", glyph: "§" },
  neuroscience: { color: "#b23f91", glyph: "◎" },
  "open-source": { color: "#6847bd", glyph: "∞" },
  "open-source-sustainability-and-support": { color: "#9b5a2b", glyph: "♲" },
  "personal-finance-and-insurance": { color: "#35756a", glyph: "◴" },
  "philosophy-and-practical-wisdom": { color: "#7560aa", glyph: "φ" },
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

// The parser keeps a uniform in-memory shape. Existing portal consumers treat
// absent display labels and former-URL aliases as empty arrays.
export function serializeCatalog(catalog) {
  const resources = catalog.resources.map((resource) => {
    if (!Array.isArray(resource.accessLabels)) throw new Error(`Invalid access labels: ${resource.id}`);
    if (!Array.isArray(resource.aliases)) throw new Error(`Invalid aliases: ${resource.id}`);
    // Put variable prose after repeated catalog fields to improve compression.
    const { description, ...fields } = resource;
    return {
      ...fields,
      accessLabels: resource.accessLabels.length ? resource.accessLabels : undefined,
      aliases: resource.aliases.length ? resource.aliases : undefined,
      description,
    };
  });
  return `${JSON.stringify({ ...catalog, resources })}\n`;
}

// The versioned compact transport retains the legacy catalog as a separate
// compatibility artifact. Normalize through its serializer to preserve exactly
// which optional properties are absent, without changing the parser's objects.
export function serializeCompactCatalog(catalog) {
  const legacy = JSON.parse(serializeCatalog(catalog));
  if (legacy.schemaVersion !== 2 || legacy.resourceCount !== legacy.resources.length) throw new Error("Invalid source catalog for compact serialization.");
  for (const resource of legacy.resources) {
    if (Object.keys(resource).some((field) => !CATALOG_RESOURCE_FIELDS.includes(field))) throw new Error(`Unsupported compact catalog field: ${resource.id}`);
  }
  const compact = {
    schemaVersion: 3,
    resourceCount: legacy.resourceCount,
    categories: legacy.categories,
    resourceColumns: Object.fromEntries(CATALOG_RESOURCE_FIELDS.map((field) => [
      field,
      legacy.resources.map((resource) => Object.hasOwn(resource, field) ? resource[field] : null),
    ])),
  };
  decodeCatalog(compact);
  return `${JSON.stringify(compact)}\n`;
}
