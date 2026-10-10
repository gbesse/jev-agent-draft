import { createHash } from "node:crypto";

export const DIMENSIONS = [
  { id: "task_fit", label: "Task fit", weight: 5 },
  { id: "permission_minimality", label: "Permission minimality", weight: 5 },
  { id: "evidence_quality", label: "Evidence quality", weight: 4 },
  { id: "maintenance", label: "Maintenance", weight: 3 },
  { id: "portability", label: "Portability", weight: 2 }
];

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("non-finite value");
  return JSON.stringify(value);
}

function portableId(value) {
  return typeof value === "string" && /^[a-z][a-z0-9_-]{0,63}$/i.test(value);
}

function unique(values) { return [...new Set(values)]; }

export function evaluateCandidates(input) {
  if (!input || typeof input !== "object") throw new TypeError("input must be an object");
  if (!Array.isArray(input.candidates) || input.candidates.length < 2 || input.candidates.length > 32) throw new TypeError("candidates must contain 2-32 items");
  if (input.candidates.some((candidate) => !portableId(candidate.id)) || unique(input.candidates.map((candidate) => candidate.id)).length !== input.candidates.length) throw new TypeError("candidate ids must be unique portable identifiers");
  const policy = input.policy ?? {};
  const allowed = new Set(policy.allowedPermissions ?? []);
  const maxAgeDays = policy.maxMaintenanceAgeDays ?? 365;
  const now = Date.parse(input.observedAt);
  if (!Number.isFinite(now)) throw new TypeError("observedAt must be an ISO date");

  const assessed = input.candidates.map((candidate) => {
    const hardFailures = [];
    const requested = unique(candidate.permissions ?? []);
    const excessive = requested.filter((permission) => !allowed.has(permission));
    if (excessive.length) hardFailures.push(`permissions outside policy: ${excessive.join(", ")}`);
    const updatedAt = Date.parse(candidate.updatedAt);
    const ageDays = Number.isFinite(updatedAt) ? Math.floor((now - updatedAt) / 86_400_000) : Infinity;
    if (ageDays < 0) hardFailures.push("updatedAt is after observedAt");
    if (ageDays > maxAgeDays) hardFailures.push(`maintenance age ${ageDays}d exceeds ${maxAgeDays}d`);
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) hardFailures.push("no evidence references");
    const ratings = candidate.ratings ?? {};
    for (const dimension of DIMENSIONS) {
      if (!Number.isFinite(ratings[dimension.id]) || ratings[dimension.id] < 0 || ratings[dimension.id] > 100) hardFailures.push(`invalid ${dimension.id} rating`);
    }
    const weighted = DIMENSIONS.reduce((sum, dimension) => sum + (Number(ratings[dimension.id]) || 0) * dimension.weight, 0);
    const weight = DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0);
    return {
      candidateId: candidate.id,
      eligible: hardFailures.length === 0,
      score: Number((weighted / weight).toFixed(4)),
      hardFailures,
      requestedPermissions: requested,
      maintenanceAgeDays: Number.isFinite(ageDays) ? ageDays : null
    };
  });
  const eligible = assessed.filter((item) => item.eligible).sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
  const ranking = [...eligible, ...assessed.filter((item) => !item.eligible).sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))];
  if (!eligible.length) return { status: "abstained", ranking, reasons: ["No candidate passed the hard gates"] };
  const minimumScore = policy.minimumScore ?? 70;
  const minimumMargin = policy.minimumMargin ?? 5;
  const leader = eligible[0];
  const margin = eligible.length > 1 ? leader.score - eligible[1].score : 100 - leader.score;
  const reasons = [];
  if (leader.score < minimumScore) reasons.push(`leader score ${leader.score} is below ${minimumScore}`);
  if (eligible.length > 1 && margin < minimumMargin) reasons.push(`leader margin ${margin.toFixed(2)} is below ${minimumMargin}`);
  if (reasons.length) return { status: "abstained", ranking, reasons };
  return { status: "selected", candidateId: leader.candidateId, confidence: Number(Math.min(1, (leader.score / 100) * (0.5 + Math.min(margin, 50) / 100)).toFixed(4)), ranking, reasons: [`${leader.candidateId} passed every hard gate and leads by ${margin.toFixed(2)} points`] };
}

export function createDraftReceipt(input) {
  const verdict = evaluateCandidates(input);
  const criteria = DIMENSIONS.map((dimension) => ({ ...dimension }));
  const evaluations = input.candidates.flatMap((candidate) => DIMENSIONS.map((dimension) => ({
    candidateId: candidate.id,
    criterionId: dimension.id,
    score: candidate.ratings[dimension.id],
    evidence: (candidate.evidence ?? []).map((ref) => typeof ref === "string" ? { ref } : ref)
  })));
  const receipt = {
    $schema: "https://jev.dev/schemas/decision-receipt/v1",
    version: "1.0.0",
    createdAt: input.observedAt,
    subject: input.task,
    revision: input.revision,
    producer: { name: "jev-agent-draft", version: "0.1.0", url: "https://github.com/gbesse/jev-agent-draft" },
    candidates: input.candidates.map(({ id, label, kind, source }) => ({ id, label, kind, source })),
    criteria,
    evaluations,
    verdict,
    provenance: { method: "hard-gates+weighted-sum", generatedBy: "software", observedAt: input.observedAt, policy: input.policy }
  };
  const payload = structuredClone(receipt);
  const digest = createHash("sha256").update(canonicalize(payload)).digest("hex");
  receipt.id = `jvr_${digest.slice(0, 20)}`;
  receipt.integrity = { algorithm: "sha256", digest };
  return receipt;
}
