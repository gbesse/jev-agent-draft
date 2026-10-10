import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalize, createDraftReceipt, evaluateCandidates } from "../src/index.js";

const fixture = JSON.parse(await readFile(new URL("../examples/code-review.candidates.json", import.meta.url), "utf8"));

test("canonicalization is stable", () => assert.equal(canonicalize({ z: 1, a: 2 }), '{"a":2,"z":1}'));
test("selects an eligible leader", () => assert.equal(evaluateCandidates(fixture).candidateId, "needle"));
test("hard-gates excess permissions", () => assert.equal(evaluateCandidates(fixture).ranking.find((c) => c.candidateId === "atlas").eligible, false));
test("reports the rejected permission", () => assert.match(evaluateCandidates(fixture).ranking.find((c) => c.candidateId === "atlas").hardFailures[0], /repository:write/));
test("keeps least-privilege candidates eligible", () => assert.equal(evaluateCandidates(fixture).ranking.find((c) => c.candidateId === "lintleaf").eligible, true));
test("abstains when all candidates fail", () => {
  const changed = structuredClone(fixture); changed.policy.allowedPermissions = [];
  assert.equal(evaluateCandidates(changed).status, "abstained");
});
test("abstains on narrow margin", () => {
  const changed = structuredClone(fixture); changed.candidates[2].ratings = structuredClone(changed.candidates[0].ratings);
  assert.match(evaluateCandidates(changed).reasons.join(" "), /margin/);
});
test("rejects stale candidates", () => {
  const changed = structuredClone(fixture); changed.policy.maxMaintenanceAgeDays = 5;
  assert.match(evaluateCandidates(changed).ranking[0].hardFailures.join(" "), /maintenance age/);
});
test("rejects missing evidence", () => {
  const changed = structuredClone(fixture); changed.candidates[0].evidence = [];
  assert.match(evaluateCandidates(changed).ranking.find((c) => c.candidateId === "needle").hardFailures.join(" "), /no evidence/);
});
test("rejects invalid ratings", () => {
  const changed = structuredClone(fixture); changed.candidates[0].ratings.task_fit = 120;
  assert.match(evaluateCandidates(changed).ranking.find((c) => c.candidateId === "needle").hardFailures.join(" "), /invalid task_fit/);
});
test("creates a Decision Receipt v1 artifact", () => {
  const receipt = createDraftReceipt(fixture);
  assert.equal(receipt.$schema, "https://jev.dev/schemas/decision-receipt/v1");
  assert.match(receipt.id, /^jvr_[a-f0-9]{20}$/);
  assert.equal(receipt.integrity.digest.length, 64);
});
test("receipt generation is deterministic", () => assert.deepEqual(createDraftReceipt(fixture), createDraftReceipt(fixture)));
