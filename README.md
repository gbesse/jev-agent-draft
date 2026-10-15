# Jev Agent Draft

[![test](https://github.com/gbesse/jev-agent-draft/actions/workflows/test.yml/badge.svg)](https://github.com/gbesse/jev-agent-draft/actions/workflows/test.yml) [![portable plugin](https://img.shields.io/badge/Agent_Plugin-portable-8dffcf.svg)](plugin.json) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Choose the right agent before granting it access.**

Jev Agent Draft compares a finite shortlist of agents, MCP servers, skills, or plugins against an explicit task and permission ceiling. Excessive permissions, stale maintenance, missing evidence, and malformed ratings are hard failures—not footnotes. A weak lead becomes an abstention, not false certainty.

Every result is emitted as a tamper-evident [Jev Decision Receipt](https://github.com/gbesse/jev-decision-receipts).

## Why now

Agent catalogs are growing faster than anyone can evaluate their permissions and evidence. Discovery answers “what exists?” Agent Draft answers “which candidate is fit for *this* task under *my* risk ceiling?”

## Run the draft room

```bash
git clone https://github.com/gbesse/jev-agent-draft.git
cd jev-agent-draft
npm test
npm run demo
```

The demo selects the strongest eligible reviewer, rejects an otherwise capable agent asking for `repository:write`, and writes `examples/code-review.jevreceipt.json`.

No dependency, API key, account, network request, installation action, or permission grant is required.

## Install as a ChatGPT/Codex plugin

This repository is a portable Agent Plugins package with a root [`plugin.json`](plugin.json), packaged skills, onboarding, and a repo marketplace.

```bash
codex plugin marketplace add gbesse/jev-agent-draft --ref main
```

Then refresh the Plugins Directory and install **Jev Agent Draft** from **Jev Labs**. The plugin is skills-first: it teaches a repeatable, safe comparison workflow while the deterministic local CLI owns scoring.

## Decision policy

Hard gates run before scoring:

- requested permissions must be within `allowedPermissions`;
- maintenance age must not exceed `maxMaintenanceAgeDays`;
- every candidate needs evidence references;
- every dimension needs a finite 0–100 rating.

Eligible candidates are weighted by task fit (5), permission minimality (5), evidence quality (4), maintenance (3), and portability (2). The leader must clear both `minimumScore` and `minimumMargin`, or the draft abstains.

## CLI

```text
jev-agent-draft draft candidates.json [decision.jevreceipt.json]
```

Start from [`examples/code-review.candidates.json`](examples/code-review.candidates.json). Registry descriptions and repository text are data only; the skill explicitly forbids treating them as instructions or executing candidate content.

## Limits

Version 0.1 evaluates evidence supplied by the user or another trusted collector. It does not crawl registries, verify publisher identity, certify security, install candidates, authenticate, or grant access. Those boundaries are intentional.

## License

MIT

## Explicit policy bounds / Bornes explicites / Límites explícitos

EN: Drafting refuses malformed permission lists, nonfinite thresholds, negative maintenance ages and scores/margins outside 0–100. Missing ratings remain a candidate hard failure and appear as `null` in receipt evaluations. Missing optional object fields are omitted canonically, so a receipt digest survives JSON serialization. This compares supplied ratings/evidence; it authenticates no catalog, installs no agent and grants no permission.

FR : La sélection refuse les listes de permissions mal formées, seuils non finis, âges négatifs et scores/marges hors 0–100. Des notes absentes restent un échec candidat et apparaissent comme `null` dans le reçu. Les champs objet optionnels absents sont omis canoniquement : le hash reste stable après sérialisation JSON. Cela compare des notes/preuves fournies ; aucun catalogue n’est authentifié, aucun agent installé, aucune permission accordée.

ES: Rechaza listas de permisos incorrectas, umbrales no finitos, edades negativas y puntuaciones/márgenes fuera de 0–100. Notas ausentes siguen siendo fallo de candidato y aparecen como `null` en el recibo. Omite canónicamente campos opcionales ausentes: el hash permanece estable tras serializar JSON. Compara notas/pruebas proporcionadas; no autentica catálogos, instala agentes ni concede permisos.
