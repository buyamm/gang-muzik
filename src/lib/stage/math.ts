/** tốc độ cuộn (px/s) để đi hết `distance` trong `durationSec` giây */
export function speedFromDuration(distance: number, durationSec: number): number {
  if (distance <= 0 || durationSec <= 0) return 0;
  return distance / durationSec;
}

/**
 * Tính vị trí bắt đầu (px) của từng "trang" khi chia nội dung cao `contentH`
 * vào màn hình cao `viewH`, chồng lấn `overlap` (0..0.5).
 * `breakpoints` (vị trí ngắt đoạn) được ưu tiên để trang không cắt ngang dòng.
 */
export function paginate(contentH: number, viewH: number, overlap = 0.1, breakpoints: number[] = []): number[] {
  if (viewH <= 0 || contentH <= viewH) return [0];
  const step = viewH * (1 - Math.min(Math.max(overlap, 0), 0.5));
  const last = contentH - viewH;
  const bps = [...breakpoints].sort((a, b) => a - b);
  const starts = [0];
  let cur = 0;
  while (cur < last - 1) {
    const ideal = cur + step;
    let next = ideal;
    // ưu tiên điểm ngắt gần ideal nhất trong vùng hợp lệ
    const candidates = bps.filter((b) => b >= cur + viewH * 0.5 && b <= cur + viewH);
    if (candidates.length) {
      next = candidates.reduce((best, b) => (Math.abs(b - ideal) < Math.abs(best - ideal) ? b : best));
    }
    cur = Math.min(next, last);
    starts.push(Math.round(cur));
  }
  return starts;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function parseDuration(input: string): number | null {
  const m = /^\s*(\d{1,3})(?::(\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  return m[2] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]);
}

/**
 * Chia nội dung thành các "trang sách" cao `pageH` (không ép trang cuối khớp đáy).
 * Ưu tiên cắt ở điểm ngắt lớn nhất còn vừa trang (giữa các dòng / ảnh).
 * Trả về vị trí bắt đầu và chiều cao hiển thị của từng trang (cắt gọn đúng chỗ ngắt).
 */
export function paginateBook(contentH: number, pageH: number, breakpoints: number[] = []): { start: number; height: number }[] {
  if (pageH <= 0) return [{ start: 0, height: contentH }];
  const bps = [...new Set(breakpoints.map(Math.round))].filter((b) => b > 0).sort((a, b) => a - b);
  const pages: { start: number; height: number }[] = [];
  let cur = 0;
  while (cur < contentH - 1) {
    if (cur + pageH >= contentH) {
      pages.push({ start: cur, height: contentH - cur });
      break;
    }
    let next = -1;
    for (const b of bps) {
      if (b > cur + pageH * 0.4 && b <= cur + pageH) next = b;
    }
    if (next > 0) {
      pages.push({ start: cur, height: next - cur });
      cur = next;
    } else {
      // không có điểm ngắt phù hợp (ảnh quá cao): cắt cứng, lặp lại 4% cho dễ nối mắt
      pages.push({ start: cur, height: pageH });
      cur = Math.round(cur + pageH * 0.96);
    }
  }
  return pages.length ? pages : [{ start: 0, height: contentH }];
}

/** số cột tự động theo kích thước khung */
export function autoColumns(width: number, height: number): number {
  if (width < 700) return 1;
  const byWidth = Math.floor(width / 440);
  const portrait = height > width * 1.1;
  return Math.max(1, Math.min(portrait ? 2 : 3, byWidth));
}
