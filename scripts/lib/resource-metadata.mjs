import { createHash } from "node:crypto";
import { urlIdentity } from "./url-identity.mjs";

export const RESOURCE_METADATA_MARKER = "akashic-meta";

export const RESOURCE_METADATA_VALUES = Object.freeze({
  resourceType: ["article", "book", "course", "dataset", "directory", "documentation", "journal", "organization", "platform", "registry", "repository", "service", "software", "standard", "tool", "website", "other"],
  role: ["discovery", "education", "evidence", "governance", "reference", "service", "tool"],
  authority: ["official", "academic", "nonprofit", "community", "commercial"],
  access: ["free", "freemium", "paid", "library", "eligibility-based"],
  platform: ["web", "android", "ios", "linux", "macos", "windows", "api", "cli", "desktop", "mobile", "self-hosted", "in-person", "browser-extension", "other"],
  account: ["none", "optional", "required", "institutional"],
  authorization: ["reference-only", "isolated-lab", "owned-systems", "explicit-scope"],
  operationalRisk: ["none", "low", "moderate", "high"],
  skillLevel: ["beginner", "intermediate", "advanced", "mixed"],
  artifactDomain: ["multi-domain", "disk", "filesystem", "memory", "network", "browser", "mobile", "cloud", "container", "media", "logs", "malware"],
  forensicRole: ["acquisition", "preservation", "examination", "analysis", "timeline", "indexing-search", "correlation-visualization", "validation", "case-management", "reporting", "education"],
  supportType: ["advertising", "directory", "donation-platform", "fiscal-hosting", "grant", "infrastructure", "legal", "maintenance", "patent-defense", "pledge", "sponsorship"],
  applicantType: ["buyer", "company", "community", "foundation", "individual", "institution", "maintainer", "nonprofit", "project", "sponsor", "varies"],
  projectStage: ["idea", "prototype", "growing", "maintained", "mature", "ecosystem", "organization", "varies"],
  programCadence: ["rolling", "continuous", "periodic", "cohort", "fixed-call", "invitation-only", "upcoming", "closed", "varies"],
  costModel: ["no-fee", "host-fee", "platform-fee", "revenue-share", "paid-service", "membership-fee", "in-kind", "varies"],
  obligation: ["application", "milestones", "reporting", "public-deliverables", "open-source-license", "host-agreement", "service-contract", "membership-agreement", "usage-limits", "attribution", "revenue-share", "security-practices", "none", "varies"],
  license: ["open-source", "open-content", "public-domain", "proprietary", "varies", "unknown"],
  status: ["active", "archived", "historical", "experimental", "deprecated"],
  volatility: ["low", "medium", "high"],
  reviewTier: ["annual", "semiannual", "quarterly", "monthly"],
  sensitive: ["medical", "legal", "financial", "emergency", "privacy", "security", "dual-use", "crisis", "youth", "other"],
  linkStatus: ["unknown", "ok", "redirected", "unavailable"],
});

const ARRAY_FIELDS = new Set(["access", "geography", "language", "platform", "authorization", "artifactDomain", "forensicRole", "supportType", "applicantType", "projectStage", "costModel", "obligation", "sensitive"]);
const DATE_FIELDS = new Set(["reviewed", "programChecked", "linkChecked"]);
const ALLOWED_FIELDS = new Set(["id", "aliases", ...Object.keys(RESOURCE_METADATA_VALUES), ...ARRAY_FIELDS, ...DATE_FIELDS]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GEOGRAPHY_PATTERN = /^(?:global|[a-z]{2}(?:-[a-z0-9]{2,8})*)$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const METADATA_PATTERN = /\s*<!--\s*akashic-meta:\s*(\{.*\})\s*-->\s*$/;

function fail(context, message) {
  throw new Error(`${context}: ${message}`);
}

function isRealDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateWebUrl(value, context, field) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(context, `${field} must contain valid URLs.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) fail(context, `${field} URLs must use HTTP or HTTPS: ${value}`);
}

function validateArray(value, context, field) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(context, `${field} must be a non-empty array of strings.`);
  }
  if (new Set(value).size !== value.length) fail(context, `${field} contains duplicate values.`);
}

export function deriveResourceId(title) {
  const normalized = title.normalize("NFKD").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = (normalized || "resource").slice(0, 48).replace(/-$/g, "");
  const digest = createHash("sha256").update(title.normalize("NFKC").toLocaleLowerCase("en-US")).digest("hex").slice(0, 10);
  return `${slug}-${digest}`;
}

export function validateResourceMetadata(metadata, context = "resource metadata") {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") fail(context, "metadata must be a JSON object.");
  for (const field of Object.keys(metadata)) {
    if (!ALLOWED_FIELDS.has(field)) fail(context, `unknown metadata field: ${field}`);
  }

  if (metadata.id !== undefined && (typeof metadata.id !== "string" || !ID_PATTERN.test(metadata.id))) {
    fail(context, "id must use lowercase letters, numbers, and single hyphens.");
  }
  if (metadata.aliases !== undefined) {
    validateArray(metadata.aliases, context, "aliases");
    for (const alias of metadata.aliases) validateWebUrl(alias, context, "aliases");
  }

  for (const [field, allowed] of Object.entries(RESOURCE_METADATA_VALUES)) {
    if (metadata[field] === undefined) continue;
    const values = ARRAY_FIELDS.has(field) ? metadata[field] : [metadata[field]];
    if (ARRAY_FIELDS.has(field)) validateArray(values, context, field);
    if (values.some((value) => !allowed.includes(value))) {
      fail(context, `${field} must use: ${allowed.join(", ")}.`);
    }
  }

  for (const field of ["geography", "language"]) {
    if (metadata[field] === undefined) continue;
    validateArray(metadata[field], context, field);
    const pattern = field === "geography" ? GEOGRAPHY_PATTERN : LANGUAGE_PATTERN;
    if (metadata[field].some((value) => !pattern.test(value))) fail(context, `${field} contains an invalid code.`);
  }

  for (const field of DATE_FIELDS) {
    if (metadata[field] !== undefined && (typeof metadata[field] !== "string" || !isRealDate(metadata[field]))) {
      fail(context, `${field} must be a real YYYY-MM-DD date.`);
    }
  }
  if (metadata.linkStatus && !metadata.linkChecked) fail(context, "linkStatus requires linkChecked.");
  if (metadata.linkChecked && !metadata.linkStatus) fail(context, "linkChecked requires linkStatus.");

  return metadata;
}

export function extractResourceMetadata(description, context = "resource metadata") {
  const match = description.match(METADATA_PATTERN);
  if (!match) return { description: description.trim(), metadata: null };
  let metadata;
  try {
    metadata = JSON.parse(match[1]);
  } catch (error) {
    fail(context, `invalid JSON (${error.message}).`);
  }
  validateResourceMetadata(metadata, context);
  return { description: description.slice(0, match.index).trim(), metadata };
}

export function applyResourceIdentity(resource) {
  const metadata = resource.metadata || {};
  return {
    ...resource,
    id: metadata.id || deriveResourceId(resource.title),
    idOrigin: metadata.id ? "explicit" : "derived",
    aliases: metadata.aliases || [],
    metadata: Object.fromEntries(Object.entries(metadata).filter(([field]) => field !== "id" && field !== "aliases")),
  };
}

export function validateResourceIdentities(resources) {
  const idOwners = new Map();
  const urlOwners = new Map();
  for (const resource of resources) {
    if (idOwners.has(resource.id)) fail(resource.source || resource.title, `duplicate resource id ${resource.id} (also used by ${idOwners.get(resource.id)}).`);
    idOwners.set(resource.id, resource.source || resource.title);

    const current = normalizeIdentityUrl(resource.url);
    if (urlOwners.has(current)) fail(resource.source || resource.title, `URL collides with ${urlOwners.get(current)}: ${resource.url}`);
    urlOwners.set(current, `${resource.id} current URL`);
    for (const alias of resource.aliases || []) {
      const normalized = normalizeIdentityUrl(alias);
      if (normalized === current) fail(resource.source || resource.title, `stale alias matches the current URL: ${alias}`);
      if (urlOwners.has(normalized)) fail(resource.source || resource.title, `alias collides with ${urlOwners.get(normalized)}: ${alias}`);
      urlOwners.set(normalized, `${resource.id} alias`);
    }
  }
  return resources;
}

export function normalizeIdentityUrl(value) {
  return urlIdentity(value);
}
