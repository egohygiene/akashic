import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateSearchLicenseManifest } from "../scripts/lib/search-licenses.mjs";

const manifest = JSON.parse(await readFile(new URL("../research/search/licenses.json", import.meta.url), "utf8"));

test("accepts the search license ledger and preserves the default-deny boundary", async () => {
  const result = await validateSearchLicenseManifest(manifest);
  assert.deepEqual(result, { entryCount: 11, shippedCount: 4, candidateCount: 7 });
  assert.equal(manifest.entries.filter((entry) => entry.sourceUrl).every((entry) => entry.redistribution === "not-approved"), true);
});

test("rejects an approved external asset without an immutable revision", async () => {
  const changed = structuredClone(manifest);
  const candidate = changed.entries.find((entry) => entry.id === "transformers-js-runtime");
  candidate.status = "approved";
  candidate.redistribution = "permitted";
  candidate.blockers = [];
  await assert.rejects(validateSearchLicenseManifest(changed), /without an immutable revision/);
});

test("rejects candidates that erase unresolved licensing work", async () => {
  const changed = structuredClone(manifest);
  changed.entries.find((entry) => entry.id === "nomic-embed-text-v1-5-model").blockers = [];
  await assert.rejects(validateSearchLicenseManifest(changed), /must record at least one blocker/);
});

test("rejects duplicate license identities", async () => {
  const changed = structuredClone(manifest);
  changed.entries[1].id = changed.entries[0].id;
  await assert.rejects(validateSearchLicenseManifest(changed), /Duplicate search license ID/);
});

test("rejects weakening or extending the approval policy", async () => {
  const changed = structuredClone(manifest);
  changed.policy.externalDefault = "permitted";
  await assert.rejects(validateSearchLicenseManifest(changed), /preserve the approval policy guardrails/);
});

test("rejects an unreviewed license expression", async () => {
  const changed = structuredClone(manifest);
  changed.entries.find((entry) => entry.id === "bge-small-en-v1-5-model").licenseSpdx = "Unknown-Permissive";
  await assert.rejects(validateSearchLicenseManifest(changed), /controlled SPDX expression/);
});
