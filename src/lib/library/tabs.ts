/**
 * Library instrument tabs: Tất cả · Saxophone · Sáo · Nhạc cụ khác.
 *
 * The URL keeps the old `?instrument=<id>` shape so shared links still work:
 * - `sax` / `flute` select their own tab;
 * - any other instrument id (`guitar`, `piano`…) selects "Nhạc cụ khác" narrowed to that instrument;
 * - `none` (songs without an instrument) also lives under "Nhạc cụ khác";
 * - `others` selects the whole "Nhạc cụ khác" group.
 */
import { INSTRUMENTS, isFocusInstrument, normalizeInstrument, type InstrumentId } from "@shared/instruments";

export type LibraryTab = "sax" | "flute" | "others";
/** An instrument id, or "none" for songs without one */
export type InstrumentFilter = InstrumentId | "none";

export const OTHERS_PARAM = "others";

export const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
  { id: "sax", label: "Saxophone" },
  { id: "flute", label: "Sáo" },
  { id: "others", label: "Nhạc cụ khác" },
];

export const UNCLASSIFIED_LABEL = "Chưa phân loại";

export interface LibrarySelection {
  tab: LibraryTab | null;
  /** narrows the "others" tab to one instrument (or to unclassified songs) */
  instrument: InstrumentFilter | null;
}

export function tabOf(id: InstrumentFilter): LibraryTab {
  return id === "sax" || id === "flute" ? id : "others";
}

/** `?instrument=` value → selected tab (+ instrument inside "others") */
export function parseInstrumentParam(raw: string | null | undefined): LibrarySelection {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return { tab: null, instrument: null };
  if (v === OTHERS_PARAM) return { tab: "others", instrument: null };
  if (v === "none") return { tab: "others", instrument: "none" };
  const id = normalizeInstrument(v);
  if (!id) return { tab: null, instrument: null };
  if (isFocusInstrument(id)) return { tab: id as LibraryTab, instrument: null };
  return { tab: "others", instrument: id };
}

/** Selection → `?instrument=` value (null = no param) */
export function selectionToParam(sel: LibrarySelection): string | null {
  if (!sel.tab) return null;
  if (sel.tab !== "others") return sel.tab;
  return sel.instrument ?? OTHERS_PARAM;
}

/** Filters a song can be found under; a song without instruments is "none" */
export function songFilters(instruments: readonly string[]): InstrumentFilter[] {
  return instruments.length ? (instruments as InstrumentFilter[]) : ["none"];
}

export function songInTab(instruments: readonly string[], tab: LibraryTab): boolean {
  return songFilters(instruments).some((id) => tabOf(id) === tab);
}

export function matchesSelection(instruments: readonly string[], sel: LibrarySelection): boolean {
  if (!sel.tab) return true;
  if (sel.instrument) return songFilters(instruments).includes(sel.instrument);
  return songInTab(instruments, sel.tab);
}

/** Songs per tab (a multi-instrument song counts in every tab it belongs to) */
export function groupByTab<T extends { instruments: readonly string[] }>(songs: readonly T[]): Record<LibraryTab, T[]> {
  const out: Record<LibraryTab, T[]> = { sax: [], flute: [], others: [] };
  for (const s of songs) for (const t of LIBRARY_TABS) if (songInTab(s.instruments, t.id)) out[t.id].push(s);
  return out;
}

/** Non-focus instruments (+ unclassified) present in `songs`, catalog order, with counts */
export function otherInstrumentCounts(songs: readonly { instruments: readonly string[] }[]): { id: InstrumentFilter; count: number }[] {
  const counts = new Map<InstrumentFilter, number>();
  for (const s of songs)
    for (const id of songFilters(s.instruments)) if (tabOf(id) === "others") counts.set(id, (counts.get(id) ?? 0) + 1);
  const order: InstrumentFilter[] = [...INSTRUMENTS.map((i) => i.id).filter((id) => !isFocusInstrument(id)), "none"];
  return order.filter((id) => counts.has(id)).map((id) => ({ id, count: counts.get(id)! }));
}
