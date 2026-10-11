// Serves the static export in out/ (what `next build` produces with output: "export").
import path from "node:path";

const root = path.join(import.meta.dir, "..", "out");
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);
    // "/" → index.html, "/seasonings" → seasonings.html, "/_next/..." → as is
    const candidates = [pathname, `${pathname}.html`, path.join(pathname, "index.html")];
    for (const c of candidates) {
      const filePath = path.join(root, path.normalize(c));
      if (!filePath.startsWith(root)) break;
      const file = Bun.file(filePath);
      if ((await file.exists()) && !filePath.endsWith(path.sep)) return new Response(file);
    }
    return new Response(Bun.file(path.join(root, "404.html")), { status: 404 });
  },
});

console.log(`Serving out/ at http://localhost:${port}`);
