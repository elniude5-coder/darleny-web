// Servidor local para probar la web con la API (no se usa en Netlify): node dev-server.mjs
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { BlobsServer } from "@netlify/blobs/server";

const token = "dev", blobs = new BlobsServer({ directory: ".blobs-dev", token, port: 8971 });
await blobs.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: "http://localhost:8971", uncachedEdgeURL: "http://localhost:8971", siteID: "dev", token })).toString("base64");
globalThis.Netlify = { env: { get: (k) => process.env[k] } };
process.env.ADMIN_PASSWORD ??= "prueba";
const { default: api } = await import("./netlify/functions/api.mjs");

const TYPES = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".jpg": "image/jpeg", ".css": "text/css" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks);
    const r = await api(new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  const p = url.pathname === "/" ? "/index.html" : url.pathname;
  try { const f = await readFile(join("public", p)); res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }); res.end(f); }
  catch { res.writeHead(404); res.end("no"); }
}).listen(8888, () => console.log("http://localhost:8888"));
