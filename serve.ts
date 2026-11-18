// Solmar Bay — a tiny static server for local play.
// Serves game/ on http://localhost:8080 so the game opens in a desktop
// browser exactly as the finalist review serves it. Node standard library
// only; nothing is installed.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const gameDir = join(fileURLToPath(new URL(".", import.meta.url)), "game");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = join(gameDir, path === "/" ? "index.html" : path);
    if (!file.startsWith(gameDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(8080, () => {
  console.log("Solmar Bay at http://localhost:8080");
});
