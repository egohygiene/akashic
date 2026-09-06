import { BlockList, isIP } from "node:net";

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

const RESERVED_IPV4_ADDRESSES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) RESERVED_IPV4_ADDRESSES.addSubnet(network, prefix, "ipv4");
const RESERVED_IPV6_ADDRESSES = new BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]) RESERVED_IPV6_ADDRESSES.addSubnet(network, prefix, "ipv6");

function isPrivateIpv4(hostname) {
  return RESERVED_IPV4_ADDRESSES.check(hostname, "ipv4");
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US");
  return RESERVED_IPV6_ADDRESSES.check(normalized, "ipv6");
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
