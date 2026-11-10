import { useEffect } from "react";
import type { SeoMeta } from "@shared/seo";

/**
 * Cập nhật <head> khi chuyển trang phía client. Thẻ ban đầu do worker chèn (data-seo),
 * ở đây chỉ sửa nội dung / thêm nếu thiếu — không tạo trùng.
 */
function upsert(selector: string, create: () => HTMLElement, attr: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = create();
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (key: "name" | "property", k: string, v: string | undefined) =>
  upsert(
    `meta[${key}="${k}"]`,
    () => {
      const m = document.createElement("meta");
      m.setAttribute(key, k);
      return m;
    },
    "content",
    v,
  );

export function useSeo(m: SeoMeta | null) {
  const key = m ? JSON.stringify(m) : "";
  useEffect(() => {
    if (!m) return;
    const url = location.origin + m.path;
    const image = m.image ? new URL(m.image, location.origin).href : undefined;
    document.title = m.title;
    meta("name", "description", m.description);
    meta("name", "robots", m.noindex ? "noindex" : undefined);
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url);
    meta("property", "og:type", m.type ?? "website");
    meta("property", "og:title", m.title);
    meta("property", "og:description", m.description);
    meta("property", "og:url", url);
    meta("property", "og:image", image);
    meta("name", "twitter:card", image ? "summary_large_image" : "summary");
    meta("name", "twitter:title", m.title);
    meta("name", "twitter:description", m.description);
    meta("name", "twitter:image", image);
    // JSON-LD do worker chèn chỉ đúng cho trang đầu tiên — bỏ khi đã chuyển sang trang khác
    document.head
      .querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
      .forEach((s) => s.dataset.seoPath !== m.path && s.remove());
  }, [key]);
}
