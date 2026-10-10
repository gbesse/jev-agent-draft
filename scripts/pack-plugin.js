import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
const output = new URL("../dist/jev-agent-draft-0.1.0.tgz", import.meta.url);
await rm(output, { force: true });
const files = ["plugin.json", "skills", "src", "examples", "assets", "README.md", "PRIVACY.md", "TERMS.md", "LICENSE"];
const result = spawnSync("tar", ["-czf", output.pathname, ...files], { cwd: new URL("../", import.meta.url), stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(output.pathname);
