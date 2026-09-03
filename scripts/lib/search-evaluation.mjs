import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function legacyJudgments(testCase, assessorId, relevantGrade) {
  return [
    ...testCase.relevantUrls.map((url) => ({
      url,
      assessments: [{ assessorId, grade: relevantGrade }],
    })),
    ...(testCase.knownIrrelevantUrls || []).map((url) => ({
      url,
      assessments: [{ assessorId, grade: 0 }],
    })),
  ];
}

function materializeVersionTwoFixture(fixture, baseFixture) {
  if (baseFixture.schemaVersion !== 1) throw new Error("Search evaluation v2 must extend a schema-version 1 fixture.");
  if (!fixture.legacyAssessorId || !fixture.legacyCaseMetadata || typeof fixture.legacyCaseMetadata !== "object") throw new Error("Search evaluation v2 must define legacy judgment provenance and case metadata.");

  const baseIds = new Set(baseFixture.cases.map((testCase) => testCase.id));
  const metadataIds = Object.keys(fixture.legacyCaseMetadata);
  const missingMetadata = [...baseIds].filter((id) => !fixture.legacyCaseMetadata[id]);
  const unknownMetadata = metadataIds.filter((id) => !baseIds.has(id));
  if (missingMetadata.length || unknownMetadata.length) {
    throw new Error(`Search evaluation v2 legacy metadata differs from its base fixture: missing [${missingMetadata.join(", ")}], unknown [${unknownMetadata.join(", ")}].`);
  }

  const inheritedCases = baseFixture.cases.map((testCase) => {
    const { relevantUrls, knownIrrelevantUrls, ...shared } = testCase;
    return {
      ...shared,
      ...fixture.legacyCaseMetadata[testCase.id],
      targetStatus: "catalog-covered",
      judgmentSource: baseFixture.id,
      judgments: legacyJudgments(testCase, fixture.legacyAssessorId, fixture.reviewProtocol.legacyBinaryRelevantGrade),
    };
  });

  const {
    extends: extendsPath,
    extendsSha256,
    legacyAssessorId,
    legacyCaseMetadata,
    ...published
  } = fixture;
  return {
    ...published,
    derivedFrom: [{ id: baseFixture.id, sourcePath: extendsPath, sha256: extendsSha256 }],
    cases: [...inheritedCases, ...fixture.cases],
  };
}

export async function loadEvaluationFixture(fixturePath) {
  const absolutePath = path.resolve(fixturePath);
  const fixture = JSON.parse(await readFile(absolutePath, "utf8"));
  if (fixture.schemaVersion !== 2 || !fixture.extends) return fixture;

  const basePath = path.resolve(path.dirname(absolutePath), fixture.extends);
  const baseText = await readFile(basePath, "utf8");
  if (!fixture.extendsSha256 || sha256(baseText) !== fixture.extendsSha256) throw new Error("Search evaluation v2 base fixture does not match its pinned SHA-256 digest.");
  const baseFixture = JSON.parse(baseText);
  return materializeVersionTwoFixture(fixture, baseFixture);
}
