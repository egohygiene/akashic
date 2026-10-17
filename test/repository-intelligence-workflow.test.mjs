import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const failureWorkflow = await readFile(new URL("../.github/workflows/repository-intelligence-failure-evidence.yml", import.meta.url), "utf8");
const gateWorkflow = await readFile(new URL("../.github/workflows/repository-intelligence-gates.yml", import.meta.url), "utf8");
const relayRevision = "04bd32c8ef492418f47d6df6faee425d6888f341";
const rollbackRelayRevision = "55587de4ff322931d401e964f5af0716633dd675";
const rollbackRevision = "cfa0cb3a948cf57eac9503604c5d19fa42178b2b";
const rollbackDigest = "sha256:969a3f82abf532ed936c2600fc73045f4df1775185d441168f74724754bcba28";

function jobSource(source, name) {
  const marker = `\n  ${name}:\n`;
  assert.ok(source.includes(marker), `Missing job ${name}`);
  return source.split(marker)[1].split(/\n  [A-Za-z][\w-]*:\n/)[0];
}

function jobPredicate(source, name) {
  const match = jobSource(source, name).match(/    if: >-\n((?:      [^\n]*(?:\n|$))+)|    if: ([^\n]+)/);
  assert.ok(match, `Missing predicate for ${name}`);
  return (match[1] || match[2]).trim().replace(/^\$\{\{\s*|\s*\}\}$/g, "").replace(/\s+/g, " ");
}

test("Pages workflow pins every external action and keeps one consumer-owned deployer", () => {
  const uses = [...`${workflow}\n${failureWorkflow}\n${gateWorkflow}`.matchAll(/^\s*uses:\s*([^\s]+)\s*$/gm)].map((match) => match[1]);
  assert.ok(uses.length > 0);
  for (const reference of uses) {
    assert.match(reference, /@[0-9a-f]{40}$/);
  }
  assert.equal(uses.filter((reference) => reference.startsWith("actions/deploy-pages@")).length, 1);
  assert.ok(uses.includes(`egohygiene/relay/.github/workflows/repository-intelligence.yml@${relayRevision}`));
  assert.ok(uses.includes(`egohygiene/relay/actions/repository-intelligence@${relayRevision}`));
  assert.ok(uses.includes(`egohygiene/relay/actions/repository-intelligence@${rollbackRelayRevision}`));
});

test("pull requests retain a complete review artifact without entering the deployment path", () => {
  assert.match(workflow, /Retain composed-site review artifact/);
  assert.match(workflow, /name: "akashic-composed-site-/);
  assert.match(workflow, /Retain composition and non-clobber evidence/);
  assert.match(workflow, /name: "akashic-composition-evidence-/);
  assert.match(jobPredicate(workflow, "deploy"), /github\.event_name != 'pull_request'/);
  assert.match(jobPredicate(workflow, "verify-live"), /github\.event_name != 'pull_request'/);
  assert.match(workflow, /permissions:\n\s+contents: read\n\nconcurrency:/);
});

test("provider scheduler fixture preserves production predicates and publication isolation", () => {
  for (const name of ["deploy", "finalize-deployment", "verify-live"]) {
    assert.equal(jobPredicate(gateWorkflow, name), jobPredicate(workflow, name).replace("github.event_name", "'workflow_dispatch'"));
  }
  for (const [fixture, production] of [["forbidden-pr-deploy", "deploy"], ["forbidden-pr-live", "verify-live"]]) {
    assert.equal(jobPredicate(gateWorkflow, fixture), jobPredicate(workflow, production).replace("github.event_name", "'pull_request'"));
    assert.match(jobSource(gateWorkflow, fixture), /run: exit 1/);
  }
  assert.equal(jobPredicate(gateWorkflow, "review"), "false");
  assert.equal(jobPredicate(gateWorkflow, "build"), "always()");
  assert.match(jobSource(gateWorkflow, "build"), /needs: review/);
  assert.equal(jobPredicate(gateWorkflow, "assert-gates"), "always()");
  assert.match(gateWorkflow, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(gateWorkflow, /:\s*write\b|secrets[.:]|pull_request_target|environment:|actions\/(?:deploy-pages|upload-pages-artifact|configure-pages|checkout)@/);
  assert.match(gateWorkflow, /retention-days: 30/);
});

test("production deployment predicates deny PRs, cancellation, and unsuccessful prerequisites", () => {
  const deploy = jobPredicate(workflow, "deploy");
  const live = jobPredicate(workflow, "verify-live");
  // GitHub adds implicit success() without a status function. Evaluating only
  // booleans locally cannot reproduce that scheduler rule, so require this
  // explicit function and exercise the skipped-ancestor graph on GitHub too.
  assert.match(deploy, /!cancelled\(\)/);
  assert.match(live, /!cancelled\(\)/);
  const evaluate = (expression, context) => runInNewContext(
    expression.replace(/needs\.([\w-]+)\.result/g, "needs[\"$1\"].result"), context,
  );
  const statuses = ["success", "failure", "cancelled", "skipped"];
  for (const event of ["push", "workflow_dispatch", "pull_request"]) {
    for (const cancelled of [false, true]) {
      for (const build of statuses) {
        for (const deployed of statuses) {
          for (const finalized of statuses) {
            const context = {
              cancelled: () => cancelled,
              github: { event_name: event },
              needs: { build: { result: build }, deploy: { result: deployed }, "finalize-deployment": { result: finalized } },
            };
            const allowed = !cancelled && event !== "pull_request" && build === "success";
            const label = JSON.stringify({ event, cancelled, build, deployed, finalized });
            assert.equal(evaluate(deploy, context), allowed, `deploy: ${label}`);
            assert.equal(evaluate(live, context), allowed && deployed === "success" && finalized === "success", `live: ${label}`);
          }
        }
      }
    }
  }
});

test("provider gate assertion retains bounded evidence and fails on the skipped-deployment regression", async () => {
  const step = gateWorkflow.split("      - name: Record and assert gate results\n")[1].split("\n      - name:")[0];
  const script = step.split("        run: |\n")[1].split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
  const root = await mkdtemp(path.join(tmpdir(), "akashic-gates-test-"));
  const expected = { review: "skipped", build: "success", deploy: "success", "finalize-deployment": "success", "verify-live": "success", "forbidden-pr-deploy": "skipped", "forbidden-pr-live": "skipped" };
  const results = Object.fromEntries(Object.entries(expected).map(([name, result]) => [name, { result, outputs: { ignored: "private-fixture-sentinel" } }]));
  const env = { ...process.env, RUNNER_TEMP: root, GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "2" };
  const execute = () => spawnSync("bash", ["-c", script], { cwd: root, env: { ...env, GATE_RESULTS: JSON.stringify(results) }, encoding: "utf8" });
  try {
    assert.equal(execute().status, 0);
    const reportPath = path.join(root, "akashic-gate-fixture.json");
    const success = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(success.conclusion, "success");
    assert.deepEqual(success.observed, expected);
    assert.deepEqual(success.run, { id: 123, attempt: 2 });
    results.deploy.result = "skipped";
    assert.notEqual(execute().status, 0);
    const failureText = await readFile(reportPath, "utf8");
    assert.equal(JSON.parse(failureText).conclusion, "failure");
    assert.ok(Buffer.byteLength(failureText) <= 8192);
    assert.doesNotMatch(failureText, /private-fixture-sentinel|outputs/);
    assert.ok(!failureText.includes(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("current publication binds deterministic build, non-clobber proof, receipt, and live routes", () => {
  for (const operation of ["capture-baseline", "verify-composition", "record-receipt"]) {
    assert.match(workflow, new RegExp(`operation: ${operation}`));
  }
  assert.match(workflow, /Canonicalize consumer baseline inventory/);
  assert.match(workflow, /sorted\(files, key=lambda item: item\.get\("path", ""\)\)/);
  assert.match(workflow, /Prove deterministic bundle reproduction/);
  assert.match(workflow, /cmp "\$\{RUNNER_TEMP\}\/build-manifest-one\.json"/);
  assert.match(workflow, /deployment-environment: github-pages/);
  assert.match(workflow, /needs\.deploy\.outputs\.deployment-url \|\| 'https:\/\/akashic\.egohygiene\.io\/'/);
  assert.match(workflow, /verify-intelligence-publication\.mjs/);
  assert.match(workflow, /FALLBACK_ORIGIN: "https:\/\/egohygiene\.github\.io\/akashic\/"/);
  assert.match(workflow, /\.relay\/repository-intelligence-deployment\/deployment-receipt\.json/);
});

test("Relay receipt verification never inherits Pages or OIDC write authority", () => {
  const deployStart = workflow.indexOf("\n  deploy:");
  const finalizeStart = workflow.indexOf("\n  finalize-deployment:");
  const liveStart = workflow.indexOf("\n  verify-live:");
  assert.ok(deployStart > 0 && finalizeStart > deployStart && liveStart > finalizeStart);
  const deployJob = workflow.slice(deployStart, finalizeStart);
  const finalizeJob = workflow.slice(finalizeStart, liveStart);
  assert.match(deployJob, /pages: write/);
  assert.match(deployJob, /id-token: write/);
  assert.equal((deployJob.match(/^\s*uses:/gm) || []).length, 1);
  assert.match(deployJob, /uses: actions\/deploy-pages@[0-9a-f]{40}/);
  assert.match(deployJob, /deployment-url: "\$\{\{ steps\.deployment\.outputs\.page_url \}\}"/);
  assert.doesNotMatch(deployJob, /egohygiene\/relay|download-artifact|contents: read|actions: read/);
  assert.match(finalizeJob, /actions: read/);
  assert.match(finalizeJob, /contents: read/);
  assert.doesNotMatch(finalizeJob, /pages: write|id-token: write|deploy-pages/);
  assert.match(finalizeJob, /operation: record-receipt/);
  assert.match(finalizeJob, /needs\.deploy\.outputs\.deployment-url/);
});

test("controlled failure evidence is isolated from every deployment lane", () => {
  assert.doesNotMatch(workflow, /failure-evidence/);
  assert.match(failureWorkflow, /on:\n\s+workflow_dispatch:/);
  assert.match(failureWorkflow, /permissions:\n\s+contents: read/);
  assert.match(failureWorkflow, new RegExp(`repository-intelligence\\.yml@${relayRevision}`));
  assert.match(failureWorkflow, /max-depth: "21"/);
  assert.doesNotMatch(failureWorkflow, /deploy-pages|pages: write|id-token: write|pull_request|push:/);
  assert.match(failureWorkflow, /cancel-in-progress: false/);
});

test("rollback remains an explicit bounded manual mode", () => {
  assert.match(workflow, /- rollback-v1\.3/);
  assert.match(workflow, new RegExp(`ROLLBACK_RELAY_REVISION: "${rollbackRelayRevision}"`));
  assert.match(workflow, new RegExp(`ROLLBACK_REVISION: "${rollbackRevision}"`));
  assert.ok(workflow.includes(`ROLLBACK_SITE_DIGEST: "${rollbackDigest}"`));
  assert.match(workflow, /last_known_good_run":? 35400101977/);
  assert.match(workflow, /inputs\.mode != 'rollback-v1\.3'/);
  assert.match(workflow, /needs\.intelligence-review\.result == 'skipped'/);
});


test("PRs prove rollback in the read-only build matrix and retain mismatch diagnostics", () => {
  const build = workflow.slice(workflow.indexOf("\n  build:"), workflow.indexOf("\n  deploy:"));
  assert.match(build, /github.event_name == 'pull_request' && fromJSON\('\["current","rollback-v1\.3"\]'\)/);
  assert.match(build, /fail-fast: false/);
  assert.match(build, /REQUESTED_MODE: "\$\{\{ matrix.mode \}\}"/);
  assert.match(build, /\[\[ "\$\{PWD##\*\/\}" == "akashic" \]\]/);
  assert.doesNotMatch(build, /pages: write|id-token: write|secrets[.:]|pull_request_target/);
  for (const label of ["Configure GitHub Pages", "Upload GitHub Pages artifact"]) {
    assert.ok(build.includes(`- name: ${label}\n        if: github.event_name != 'pull_request'`));
  }
  assert.match(build, /always\(\) && \(steps.rollback_digest.outcome == 'success' \|\| steps.rollback_digest.outcome == 'failure'\)/);
});

test("rollback digest gate retains public diagnostics, rejects changed bytes and symlinks", async () => {
  const step = workflow.split("      - name: Verify fixed rollback site digest\n")[1].split("\n      - name:")[0];
  const script = step.split("        run: |\n")[1].split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
  const root = await mkdtemp(path.join(tmpdir(), "akashic-rollback-test-"));
  const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  try {
    await mkdir(path.join(root, "dist", "i18n"), { recursive: true });
    const files = [[".nojekyll", ""], ["i18n/en.json", "{}\n"], ["i18n.js", "// fixture\n"]];
    for (const [name, bytes] of files) await writeFile(path.join(root, "dist", name), bytes);
    // Path component order intentionally puts i18n/en.json before i18n.js.
    const inventory = files.map(([name, bytes]) => ({ bytes: Buffer.byteLength(bytes), path: name, sha256: sha(bytes) }));
    const digest = sha(`${JSON.stringify(inventory)}\n`);
    const env = { ...process.env, RUNNER_TEMP: root, ROLLBACK_SITE_DIGEST: digest,
      GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "2", PRIVATE_SENTINEL: "do-not-retain-this-value" };
    const execute = () => spawnSync("bash", ["-c", script], { cwd: root, env, encoding: "utf8" });
    const success = execute();
    assert.equal(success.status, 0, success.stderr);
    const reportPath = path.join(root, "akashic-rollback-evidence", "rollback.json");
    const successReport = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(successReport.conclusion, "success");
    assert.equal(successReport.site_digest, digest);
    assert.deepEqual(successReport.recovery_run, { id: 123, attempt: 2 });
    assert.equal(await readFile(path.join(root, "akashic-rollback-evidence", "site-inventory.json"), "utf8"), `${JSON.stringify(inventory)}\n`);
    await writeFile(path.join(root, "dist", "i18n.js"), "changed\n");
    const failure = execute();
    assert.notEqual(failure.status, 0);
    const failureText = await readFile(reportPath, "utf8");
    const failureReport = JSON.parse(failureText);
    assert.equal(failureReport.conclusion, "failure");
    assert.equal(failureReport.expected_site_digest, digest);
    assert.notEqual(failureReport.site_digest, digest);
    assert.doesNotMatch(failureText + failure.stdout + failure.stderr, /do-not-retain-this-value|PRIVATE_SENTINEL/);
    assert.ok(!failureText.includes(root));
    await symlink("i18n.js", path.join(root, "dist", "linked.js"));
    const unsafe = execute();
    assert.notEqual(unsafe.status, 0);
    assert.match(unsafe.stderr, /symbolic link/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
