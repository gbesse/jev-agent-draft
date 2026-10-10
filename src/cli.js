#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createDraftReceipt } from "./index.js";

const [command, inputPath, outputPath] = process.argv.slice(2);
if (command !== "draft" || !inputPath) {
  console.error("Usage: jev-agent-draft draft <candidates.json> [decision.jevreceipt.json]");
  process.exit(2);
}
try {
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const receipt = createDraftReceipt(input);
  const output = outputPath ?? "agent-draft.jevreceipt.json";
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`${receipt.verdict.status} ${receipt.verdict.candidateId ?? "none"} -> ${output}`);
} catch (error) {
  console.error(error.message); process.exit(1);
}
