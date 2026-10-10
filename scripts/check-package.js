import { access, readFile } from "node:fs/promises";

const required = ["plugin.json", "skills/agent-draft/SKILL.md", "skills/setup/SKILL.md", ".agents/plugins/marketplace.json", "PRIVACY.md", "TERMS.md"];
for (const path of required) await access(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(await readFile(new URL("../plugin.json", import.meta.url), "utf8"));
if (manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") throw new Error("portable plugin schema missing");
if (manifest.extensions?.["com.openai"]?.onboardingSkill !== "./skills/setup/SKILL.md") throw new Error("onboarding skill is not wired");
const marketplace = JSON.parse(await readFile(new URL("../.agents/plugins/marketplace.json", import.meta.url), "utf8"));
if (marketplace.plugins?.[0]?.source?.path !== "./") throw new Error("marketplace root path mismatch");
console.log("plugin package ok");
