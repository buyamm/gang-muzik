/**
 * Nội dung SEO dùng chung cho worker (chèn vào HTML trước khi gửi, để bot đọc được)
 * và frontend (cập nhật khi chuyển trang phía client) — hai bên luôn khớp nhau.
 */
import { INSTRUMENTS, instrumentLabel, normalizeInstrument } from "./instruments";
import type { Song } from "./types";

export const SITE_NAME = "Gang Muzik";
export const DEFAULT_DESCRIPTION =
  "Thư viện sheet nhạc, cảm âm, hợp âm, tab tự cuộn, lật trang bằng pedal — rảnh tay khi chơi mọi nhạc cụ.";

export interface SeoMeta {
  title: string;
  description: string;
  /** đường dẫn (kèm query nếu cần), vd "/s/abc" */
  path: string;
  /** đường dẫn hoặc URL ảnh xem trước */
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

const KIND_LABEL: Record<Song["kind"], string> = { sheet: "Sheet nhạc", text: "Cảm âm / hợp âm" };

/** cắt gọn ở ranh giới từ, không vượt `max` ký tự */
export function truncate(s: string, max = 160) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(" ");
  return `${(i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}

export function homeSeo(instrumentParam?: string | null): SeoMeta {
  const id = instrumentParam ? normalizeInstrument(instrumentParam) : "";
  // "other" cũng là đích của giá trị lạ — không coi là trang danh mục riêng
  if (id && id !== "other") {
    const label = instrumentLabel(id);
    return {
      title: `Sheet nhạc, cảm âm ${label} · ${SITE_NAME}`,
      description: `Tuyển tập sheet nhạc, cảm âm, hợp âm cho ${label} — tự cuộn, tự lật trang, điều khiển bằng pedal Bluetooth.`,
      path: `/?instrument=${id}`,
      type: "website",
    };
  }
  return { title: `${SITE_NAME} · Thư viện sheet nhạc, cảm âm, hợp âm`, description: DEFAULT_DESCRIPTION, path: "/", type: "website" };
}

export function songSeo(song: Pick<Song, "id" | "title" | "artist" | "instruments" | "kind" | "pages">): SeoMeta {
  const by = song.artist ? ` — ${song.artist}` : "";
  const inst = song.instruments.map(instrumentLabel).filter(Boolean);
  const kind = KIND_LABEL[song.kind];
  return {
    title: `${song.title}${by} · ${kind} · ${SITE_NAME}`,
    description: truncate(
      `${kind} bài “${song.title}”${by}${inst.length ? ` cho ${inst.join(", ")}` : ""}. ` +
        "Tự cuộn theo nhịp bài, tự lật trang, điều khiển bằng pedal Bluetooth — rảnh tay khi chơi.",
    ),
    path: `/s/${song.id}`,
    image: song.pages[0]?.url,
    type: "article",
  };
}

export const LEGAL_SEO = {
  privacy: { title: `Chính sách quyền riêng tư · ${SITE_NAME}`, description: "Gang Muzik thu thập và dùng dữ liệu của bạn như thế nào.", path: "/privacy" },
  terms: { title: `Điều khoản sử dụng · ${SITE_NAME}`, description: "Điều khoản khi dùng và đóng góp bài cho Gang Muzik.", path: "/terms" },
} satisfies Record<string, SeoMeta>;

export const notFoundSeo = (path: string): SeoMeta => ({
  title: `Không tìm thấy · ${SITE_NAME}`,
  description: DEFAULT_DESCRIPTION,
  path,
  noindex: true,
});

/** các trang danh mục nhạc cụ (đưa vào sitemap) */
export const INSTRUMENT_PATHS = INSTRUMENTS.filter((i) => i.id !== "other").map((i) => `/?instrument=${i.id}` as const);

/** dữ liệu có cấu trúc schema.org cho một bài */
export function songJsonLd(song: Pick<Song, "id" | "title" | "artist" | "instruments" | "kind" | "pages" | "updatedAt" | "createdAt">, origin: string) {
  const meta = songSeo(song);
  const url = origin + meta.path;
  return [
    {
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: song.title,
      url,
      description: meta.description,
      inLanguage: "vi",
      ...(song.artist ? { creator: { "@type": "Person", name: song.artist } } : {}),
      ...(meta.image ? { image: origin + meta.image } : {}),
      ...(song.instruments.length ? { keywords: song.instruments.map(instrumentLabel).join(", ") } : {}),
      dateCreated: new Date(song.createdAt).toISOString(),
      dateModified: new Date(song.updatedAt).toISOString(),
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${origin}/` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Thư viện", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: song.title, item: url },
      ],
    },
  ];
}

export function siteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${origin}/`,
    inLanguage: "vi",
    description: DEFAULT_DESCRIPTION,
  };
}
