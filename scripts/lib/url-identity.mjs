import { isIP } from "node:net";

const BROWSER_INTERNAL_SCHEMES = new Set([
  "about:",
  "chrome-extension:",
  "chrome:",
  "edge:",
  "moz-extension:",
  "opera:",
  "resource:",
  "view-source:",
]);
const EXECUTABLE_SCHEMES = new Set(["data:", "javascript:", "vbscript:"]);
const SENSITIVE_PARAMETER_NAMES = new Set([
  "access_token",
  "api_key",
  "apikey",
  "auth",
  "auth_token",
  "authorization",
  "bearer",
  "credential",
  "jwt",
  "key",
  "password",
  "secret",
  "session",
  "session_id",
  "sessionid",
  "sid",
  "signature",
  "signed",
  "ticket",
  "token",
]);
const TRACKING_PARAMETER_PATTERNS = [
  /^utm_/i,
  /^(?:dclid|fbclid|gclid|gbraid|msclkid|twclid|wbraid)$/i,
  /^(?:igshid|mc_cid|mc_eid|mkt_tok|oly_anon_id|oly_enc_id)$/i,
  /^(?:ref|referrer|source)$/i,
  /^ref_/i,
];

function isPrivateIpv4(hostname) {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 192 && second === 0)
    || (first === 192 && second === 168)
    || (first === 198 && [18, 19].includes(second))
    || (first === 198 && second === 51)
    || (first === 203 && second === 0)
    || first >= 224;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US");
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:10.")
    || normalized.startsWith("::ffff:192.168.");
}

export function isPrivateNetworkHostname(value) {
  const hostname = value.replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US").replace(/\.$/, "");
  const version = isIP(hostname);
  if (!version && (!hostname.includes(".") || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".home") || hostname.endsWith(".home.arpa"))) return true;
  if (version === 4) return isPrivateIpv4(hostname);
  if (version === 6) return isPrivateIpv6(hostname);
  return false;
}

export function isTrackingParameter(name) {
  return TRACKING_PARAMETER_PATTERNS.some((pattern) => pattern.test(name));
}

export function canonicalizeWebUrl(value) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`URL must use HTTP or HTTPS: ${value}`);
  if (parsed.username || parsed.password) throw new Error("URL must not contain credentials.");

  const removedTrackingParameters = [];
  for (const name of [...new Set(parsed.searchParams.keys())]) {
    if (!isTrackingParameter(name)) continue;
    removedTrackingParameters.push(name);
    parsed.searchParams.delete(name);
  }
  parsed.searchParams.sort();
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return {
    url: parsed.toString(),
    removedTrackingParameters: removedTrackingParameters.sort((left, right) => left.localeCompare(right)),
  };
}

export function urlIdentity(value) {
  const { url } = canonicalizeWebUrl(value);
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
  return `${hostname}${parsed.port ? `:${parsed.port}` : ""}${pathname}${parsed.search}${parsed.hash}`;
}

export function nearUrlIdentity(value) {
  const { url } = canonicalizeWebUrl(value);
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  let pathname = parsed.pathname.toLocaleLowerCase("en-US").replace(/\/(?:index|default)\.(?:html?|aspx?)$/i, "/");
  if (pathname !== "/") pathname = pathname.replace(/\/+$/, "");
  return `${hostname}${parsed.port ? `:${parsed.port}` : ""}${pathname === "/" ? "" : pathname}`;
}

function sensitiveUrlReason(parsed) {
  for (const name of parsed.searchParams.keys()) {
    if (SENSITIVE_PARAMETER_NAMES.has(name.toLocaleLowerCase("en-US"))) return "likely-session-or-token";
  }
  let fragment = parsed.hash.slice(1);
  try { fragment = decodeURIComponent(fragment); } catch {}
  fragment = fragment.toLocaleLowerCase("en-US");
  if (/(?:^|[?&])(?:access_token|auth_token|jwt|password|session(?:_id)?|signature|token)=/.test(fragment)) return "likely-session-or-token";
  if (/(?:;|\/)(?:jsessionid|sessionid|token|auth)[=/:_-][a-z0-9._~-]{8,}/i.test(parsed.pathname)) return "likely-session-or-token";
  return null;
}

export function inspectBookmarkUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { accepted: false, reason: "malformed-url" };
  }
  if (BROWSER_INTERNAL_SCHEMES.has(parsed.protocol)) return { accepted: false, reason: "browser-internal" };
  if (parsed.protocol === "file:") return { accepted: false, reason: "local-file" };
  if (EXECUTABLE_SCHEMES.has(parsed.protocol)) return { accepted: false, reason: "executable-url" };
  if (!["http:", "https:"].includes(parsed.protocol)) return { accepted: false, reason: "unsupported-scheme" };
  if (parsed.username || parsed.password) return { accepted: false, reason: "credential-bearing" };
  if (isPrivateNetworkHostname(parsed.hostname)) return { accepted: false, reason: "private-network" };
  const sensitiveReason = sensitiveUrlReason(parsed);
  if (sensitiveReason) return { accepted: false, reason: sensitiveReason };

  const canonical = canonicalizeWebUrl(parsed.toString());
  return {
    accepted: true,
    canonicalUrl: canonical.url,
    identity: urlIdentity(canonical.url),
    nearIdentity: nearUrlIdentity(canonical.url),
    hostname: new URL(canonical.url).hostname.toLocaleLowerCase("en-US").replace(/^www\./, ""),
    removedTrackingParameters: canonical.removedTrackingParameters,
  };
}
