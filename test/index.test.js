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

test('nonfinite or out-of-range policy thresholds cannot silently select a candidate',()=>{
 for(const field of ['minimumScore','minimumMargin','maxMaintenanceAgeDays'])for(const value of [NaN,Infinity,-1,'0',true]){
  const input=structuredClone(fixture);input.policy[field]=value;assert.throws(()=>evaluateCandidates(input),/Invalid policy/);
 }
 const input=structuredClone(fixture);input.policy.allowedPermissions='repository:read';assert.throws(()=>evaluateCandidates(input),/Invalid policy/);
});
test('receipt digest survives JSON roundtrip with missing optional fields and ratings',()=>{
 const input=structuredClone(fixture);delete input.revision;delete input.candidates[0].ratings;
 const receipt=createDraftReceipt(input),parsed=JSON.parse(JSON.stringify(receipt));
 const {id,integrity,...payload}=parsed;
 assert.equal(canonicalize(payload),canonicalize((({id,integrity,...rest})=>rest)(receipt)));
 assert.equal(parsed.evaluations[0].score,null);
 assert.equal(parsed.verdict.ranking.find(x=>x.candidateId==='needle').eligible,false);
});


test('returned integrity artifact never aliases caller policy, evidence or subject',async()=>{
 const {createHash}=await import('node:crypto');
 const input=structuredClone(fixture);input.task={description:'synthetic task'};input.candidates[0].evidence=[{ref:'https://example.test/synthetic',metadata:{source:'synthetic'}}];
 const receipt=createDraftReceipt(input),before=JSON.stringify(receipt);
 input.policy.minimumScore=0;input.task.description='mutated';input.candidates[0].evidence[0].metadata.source='mutated';
 assert.equal(JSON.stringify(receipt),before);
 const {id,integrity,...payload}=JSON.parse(JSON.stringify(receipt));assert.equal(createHash('sha256').update(canonicalize(payload)).digest('hex'),integrity.digest);
 receipt.provenance.policy.minimumScore=99;assert.equal(input.policy.minimumScore,0);
});
test('exported fixed scoring dimensions cannot silently change future decisions',async()=>{
 const {DIMENSIONS}=await import('../src/index.js');const before=evaluateCandidates(fixture);
 assert.throws(()=>{DIMENSIONS[0].weight=0;},TypeError);assert.throws(()=>{DIMENSIONS.pop();},TypeError);
 assert.deepEqual(evaluateCandidates(fixture),before);
});
