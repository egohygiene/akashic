import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeWebUrl, inspectBookmarkUrl, isPrivateNetworkHostname, nearUrlIdentity, urlIdentity } from "../scripts/lib/url-identity.mjs";

test("canonical URL identity strips tracking without erasing meaningful parameters", () => {
  const canonical = canonicalizeWebUrl("https://www.Example.com/path/?utm_source=mail&lang=en&fbclid=abc#details");
  assert.deepEqual(canonical, {
    url: "https://www.example.com/path?lang=en#details",
    removedTrackingParameters: ["fbclid", "utm_source"],
  });
  assert.equal(urlIdentity(canonical.url), "example.com/path?lang=en#details");
  assert.equal(urlIdentity("http://example.com/"), "example.com");
  assert.equal(nearUrlIdentity("https://www.example.com/docs/index.html?lang=en"), "example.com/docs");
});

test("bookmark URL inspection rejects unsafe and private URL classes", () => {
  const rejected = new Map([
    ["chrome://settings/", "browser-internal"],
    ["file:///Users/example/bookmarks.html", "local-file"],
    ["javascript:alert(1)", "executable-url"],
    ["ftp://example.com/file", "unsupported-scheme"],
    ["https://user:password@example.com/", "credential-bearing"],
    ["http://127.0.0.1/admin", "private-network"],
    ["https://router.local/", "private-network"],
    ["https://example.com/callback?access_token=secret", "likely-session-or-token"],
  ]);
  for (const [url, reason] of rejected) assert.deepEqual(inspectBookmarkUrl(url), { accepted: false, reason });
  assert.equal(inspectBookmarkUrl("not a URL").reason, "malformed-url");
});

test("private-network detection covers local IPv4 and IPv6 ranges", () => {
  for (const hostname of ["localhost", "intranet", "service.internal", "10.1.2.3", "100.64.1.2", "172.16.1.2", "192.168.1.1", "::1", "fd00::1", "fe80::1"]) {
    assert.equal(isPrivateNetworkHostname(hostname), true, hostname);
  }
  assert.equal(isPrivateNetworkHostname("example.com"), false);
  assert.equal(isPrivateNetworkHostname("8.8.8.8"), false);
});
