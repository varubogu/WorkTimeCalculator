import { join } from "path";

const PORT = parseInt(process.env.PORT ?? "3000");
const DIST_DIR = join(import.meta.dir, "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".woff2": "font/woff2",
};

function mimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    if (pathname.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }

    const filePath = join(DIST_DIR, pathname);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      // SPA fallback — serve index.html for any unknown path
      const index = Bun.file(join(DIST_DIR, "index.html"));
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(file, {
      headers: {
        "Content-Type": mimeType(filePath),
        "Cache-Control": pathname === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable",
      },
    });
  },
});

console.log(`Work Time Calculator running at http://localhost:${server.port}`);
