// Solmar Bay — the entry program.
// Hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes dossier.json with the kit's
// buildDossier, so the gate can check the game and the judge can read it.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The gate's caps, as the kit's RULES.txt states them: the dossier at most
// 1.5 MiB with 160 KiB of source text, index.html at most 1 MiB, game/ at
// most 993 entries and 48 MiB, paths at most 1,000 bytes, 4 screenshots.
const caps = {
  text_max_bytes: 163840,
  dossier_max_bytes: 1572864,
  dossier_max_images: 4,
  index_html_max_bytes: 1048576,
  game_path_max_bytes: 1000,
  game_max_files: 993,
  game_max_bytes: 50331648,
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = await buildDossier(repoRoot, caps);
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log(`Solmar Bay handed in: ${outDir} (${dossier.length} bytes of dossier)`);
