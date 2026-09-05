import { applyResourceIdentity, deriveResourceId, extractResourceMetadata } from "./resource-metadata.mjs";

const ATLAS_ROLES = new Set(["resource", "index"]);

export function parseResourceEntry(line, { context = "resource entry", extractLeadingLabels = false } = {}) {
  const entry = line.match(/^- \[([^\]]+)]\((https?:\/\/[^)]+)\) - (.+)$/);
  if (!entry) return null;
  const parsedMetadata = extractResourceMetadata(entry[3], context);
  let description = parsedMetadata.description;
  let accessLabels = [];
  if (extractLeadingLabels) {
    const labelBlock = description.match(/^\*\*([^*]+?)\.\*\*\s+(.+)$/);
    if (labelBlock) {
      accessLabels = labelBlock[1].split("·").map((label) => label.trim()).filter(Boolean);
      description = labelBlock[2].trim();
    }
  }
  return applyResourceIdentity({
    title: entry[1].trim(),
    url: entry[2].trim(),
    description,
    accessLabels,
    metadata: parsedMetadata.metadata,
  });
}

export function parseAtlasResourceEntry(line, { context = "Atlas resource entry", locationId } = {}) {
  const entry = line.match(/^- \[([^\]]+)]\((https?:\/\/[^)]+)\) - (.+)$/);
  if (!entry) return null;
  if (!locationId) throw new Error(`${context}: Atlas resource needs a location ID.`);
  const roleMatch = entry[3].match(/\s*<!--\s*atlas-role:\s*([a-z-]+)\s*-->\s*$/);
  const role = roleMatch?.[1] || "resource";
  if (!ATLAS_ROLES.has(role)) throw new Error(`${context}: unsupported atlas role ${role}.`);
  const title = entry[1].trim();
  return {
    id: `atlas-${locationId}-${deriveResourceId(title)}`,
    idOrigin: "derived",
    aliases: [],
    metadata: {},
    title,
    url: entry[2].trim(),
    description: roleMatch ? entry[3].slice(0, roleMatch.index).trim() : entry[3].trim(),
    role,
  };
}
