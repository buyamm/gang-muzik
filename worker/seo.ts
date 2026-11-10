import { Hono, type Context } from "hono";
import type { AppEnv } from "./env";
import { getPages, getSongRow, toSong, type SongRow } from "@shared/server/db";
import {
  INSTRUMENT_PATHS,
  LEGAL_SEO,
  SITE_NAME,
  homeSeo,
  notFoundSeo,
  siteJsonLd,
  songJsonLd,
  songSeo,
  type SeoMeta,
} from "@shared/seo";
import { instrumentLabel } from "@shared/instruments";

/**
 * Trang HTML cho bot tìm kiếm / mạng xã hội: lấy index.html của SPA, chèn title, meta,
 * Open Graph, canonical, JSON-LD và một bản nội dung tĩnh vào #root (React thay thế khi chạy).
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** JSON an toàn khi đặt trong <script> */
const jsonScript = (path: string) => (data: unknown) =>
  `<script type="application/ld+json" data-seo-path="${esc(path)}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

function headTags(m: SeoMeta, origin: string, jsonLd: unknown[]) {
  const url = origin + m.path;
  const image = m.image ? (m.image.startsWith("http") ? m.image : origin + m.image) : "";
  const tags = [
    `<link rel="canonical" href="${esc(url)}" data-seo />`,
    m.noindex ? `<meta name="robots" content="noindex" data-seo />` : "",
    `<meta property="og:site_name" content="${SITE_NAME}" data-seo />`,
    `<meta property="og:locale" content="vi_VN" data-seo />`,
    `<meta property="og:type" content="${m.type ?? "website"}" data-seo />`,
    `<meta property="og:title" content="${esc(m.title)}" data-seo />`,
    `<meta property="og:description" content="${esc(m.description)}" data-seo />`,
    `<meta property="og:url" content="${esc(url)}" data-seo />`,
    image ? `<meta property="og:image" content="${esc(image)}" data-seo />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" data-seo />`,
    `<meta name="twitter:title" content="${esc(m.title)}" data-seo />`,
    `<meta name="twitter:description" content="${esc(m.description)}" data-seo />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" data-seo />` : "",
    ...jsonLd.map(jsonScript(m.path)),
  ];
  return tags.filter(Boolean).join("\n    ");
}

async function render(c: Context<AppEnv>, m: SeoMeta, opts: { jsonLd?: unknown[]; body?: string; status?: 200 | 404 } = {}) {
  const origin = new URL(c.req.url).origin;
  const shell = await c.env.ASSETS.fetch(new URL("/", c.req.url));
  const res = new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(m.title) })
    .on('meta[name="description"]', { element: (el) => void el.setAttribute("content", m.description) })
    .on("head", { element: (el) => void el.append(headTags(m, origin, opts.jsonLd ?? []), { html: true }) })
    .on("#root", { element: (el) => void (opts.body && el.setInnerContent(opts.body, { html: true })) })
    .transform(shell);
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  // HTML luôn kiểm tra lại (bài có thể vừa được duyệt / sửa); bot vẫn được cache ngắn ở edge
  headers.set("cache-control", "public, max-age=0, s-maxage=300, must-revalidate");
  headers.delete("etag");
  headers.delete("content-length");
  return new Response(res.body, { status: opts.status ?? 200, headers });
}

async function approvedSongs(db: D1Database) {
  const { results } = await db
    .prepare(`SELECT id, title, artist, instruments, updated_at FROM songs WHERE status = 'approved' ORDER BY updated_at DESC LIMIT 1000`)
    .all<Pick<SongRow, "id" | "title" | "artist" | "instruments" | "updated_at">>();
  return results;
}

export const seo = new Hono<AppEnv>()
  .get("/", async (c) => {
    const origin = new URL(c.req.url).origin;
    const m = homeSeo(c.req.query("instrument"));
    const songs = await approvedSongs(c.env.DB);
    const body =
      `<main><h1>${esc(m.title)}</h1><p>${esc(m.description)}</p><ul>` +
      songs
        .map((s) => `<li><a href="/s/${esc(s.id)}">${esc(s.title)}${s.artist ? ` — ${esc(s.artist)}` : ""}</a></li>`)
        .join("") +
      `</ul></main>`;
    return render(c, m, { jsonLd: [siteJsonLd(origin)], body });
  })
  .get("/s/:id", async (c) => {
    const id = c.req.param("id");
    const row = await getSongRow(c.env.DB, id);
    if (!row || row.status !== "approved") return render(c, notFoundSeo(c.req.path), { status: 404 });
    const song = toSong(row, await getPages(c.env.DB, id));
    const m = songSeo(song);
    const origin = new URL(c.req.url).origin;
    const inst = song.instruments.map(instrumentLabel).join(", ");
    const body =
      `<main><h1>${esc(song.title)}</h1>` +
      (song.artist ? `<p>${esc(song.artist)}</p>` : "") +
      (inst ? `<p>Nhạc cụ: ${esc(inst)}</p>` : "") +
      (song.kind === "text" && song.textContent ? `<pre>${esc(song.textContent.slice(0, 20000))}</pre>` : "") +
      song.pages.map((p, i) => `<img src="${esc(p.url)}" alt="${esc(`${song.title} — trang ${i + 1}`)}" width="${p.width}" height="${p.height}" />`).join("") +
      `</main>`;
    return render(c, m, { jsonLd: songJsonLd(song, origin), body });
  })
  .get("/privacy", (c) => render(c, LEGAL_SEO.privacy))
  .get("/terms", (c) => render(c, LEGAL_SEO.terms))
  .get("/robots.txt", (c) => {
    const origin = new URL(c.req.url).origin;
    return c.text(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, 200, {
      "cache-control": "public, max-age=3600",
    });
  })
  .get("/sitemap.xml", async (c) => {
    const origin = new URL(c.req.url).origin;
    const songs = await approvedSongs(c.env.DB);
    const latest = songs[0]?.updated_at;
    const url = (path: string, lastmod?: number) =>
      `<url><loc>${esc(origin + path)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}</url>`;
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      [
        url("/", latest),
        ...INSTRUMENT_PATHS.map((p) => url(p)),
        ...songs.map((s) => url(`/s/${s.id}`, s.updated_at)),
        url(LEGAL_SEO.privacy.path),
        url(LEGAL_SEO.terms.path),
      ].join("") +
      `</urlset>`;
    return c.body(xml, 200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=600" });
  });
