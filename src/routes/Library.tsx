import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, FileImage, Hand, PenLine, Search, Type } from "lucide-react";
import type { SongKind, SongSummary } from "@shared/types";
import { instrumentLabel } from "@shared/instruments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SongMotif } from "@/components/brand/Staff";
import { api } from "@/lib/api";
import { STUDIO_URL } from "@/lib/links";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatKeyName } from "@/lib/notation/transpose";
import {
  LIBRARY_TABS,
  UNCLASSIFIED_LABEL,
  groupByTab,
  matchesSelection,
  otherInstrumentCounts,
  parseInstrumentParam,
  selectionToParam,
  type InstrumentFilter,
  type LibrarySelection,
  type LibraryTab,
} from "@/lib/library/tabs";
import { cn } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { homeSeo } from "@shared/seo";

const FILTERS: { value: SongKind | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "text", label: "Dạng chữ" },
  { value: "sheet", label: "Ảnh / Sheet" },
];

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const tabLabel = (tab: LibraryTab) => LIBRARY_TABS.find((t) => t.id === tab)!.label;
const filterLabel = (id: InstrumentFilter) => (id === "none" ? UNCLASSIFIED_LABEL : instrumentLabel(id));

export function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SongKind | "all">("all");
  const songs = useQuery({ queryKey: ["songs"], queryFn: api.listSongs });
  // the selected tab lives in the URL (?instrument=sax) so links can be shared; old ?instrument=guitar links still work
  const [params, setParams] = useSearchParams();
  const param = params.get("instrument");
  const selection = useMemo(() => parseInstrumentParam(param), [param]);
  const select = (next: LibrarySelection) =>
    setParams(
      (p) => {
        const v = selectionToParam(next);
        if (v) p.set("instrument", v);
        else p.delete("instrument");
        return p;
      },
      { replace: true },
    );

  /** filtered by text + song kind (not by instrument yet) — used for the per-tab counts */
  const base = useMemo(() => {
    const q = strip(query.trim());
    return (songs.data ?? []).filter(
      (s) =>
        (filter === "all" || s.kind === filter) &&
        (!q || strip(`${s.title} ${s.artist} ${s.instruments.map(instrumentLabel).join(" ")}`).includes(q)),
    );
  }, [songs.data, query, filter]);

  const byTab = useMemo(() => groupByTab(base), [base]);
  const others = useMemo(() => otherInstrumentCounts(byTab.others), [byTab]);
  const list = useMemo(() => base.filter((s) => matchesSelection(s.instruments, selection)), [base, selection]);
  const searching = !!query.trim() || filter !== "all";
  useSeo(homeSeo(selection.tab === "others" ? (selection.instrument === "none" ? null : selection.instrument) : selection.tab));

  const listTitle = selection.instrument ? filterLabel(selection.instrument) : selection.tab ? tabLabel(selection.tab) : "Kết quả";

  return (
    <div className="min-h-full">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12" aria-labelledby="hero-title">
        <h1
          id="hero-title"
          className="font-display text-[2.15rem] leading-[0.95] font-extrabold tracking-tight [font-variation-settings:'wdth'_78] min-[400px]:text-[2.5rem] sm:text-[3.7rem]"
        >
          <span className="staff-lines flex h-[calc(var(--staff-gap)*4+1px)] items-center [--staff-gap:9px] min-[400px]:[--staff-gap:10px] sm:[--staff-gap:13px]">
            Học sax & sáo trúc,
          </span>
          <span className="mt-2 block text-primary sm:mt-3">bấm chạy là thổi</span>
        </h1>
        <p className="mt-4 max-w-[38rem] text-pretty text-muted-foreground sm:text-lg">
          Tra thế bấm từng nốt, luyện gam theo nhịp, rồi mở bài để sheet và cảm âm tự cuộn. Có pedal thì lật trang bằng chân.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/fingering">
              <Hand /> Tra thế bấm
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/practice">
              <AudioLines /> Luyện gam
            </Link>
          </Button>
        </div>
      </section>

      {/* search bar sticks to the top while scrolling the list */}
      <div className="sticky top-0 z-10 mt-8 border-b bg-background/85 backdrop-blur-md sm:mt-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài để tập sax, sáo…"
              aria-label="Tìm bài theo tên, ca sĩ hoặc nhạc cụ"
              className="h-12 rounded-full bg-card pl-12 text-base md:text-base"
              type="search"
            />
          </div>
          <div className="flex gap-1 rounded-full border bg-card p-1" role="radiogroup" aria-label="Lọc theo dạng bài">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="radio"
                aria-checked={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "flex-1 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-none sm:px-4",
                  filter === f.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
        {songs.isPending ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
            ))}
          </ul>
        ) : songs.isError ? (
          <p className="py-16 text-center text-destructive">Không tải được thư viện: {songs.error.message}. Tải lại trang để thử lần nữa.</p>
        ) : base.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <p className="font-display text-2xl font-bold">{songs.data.length ? "Không có bài nào khớp" : "Thư viện còn trống"}</p>
            <p className="mt-2 text-muted-foreground">
              {songs.data.length ? "Thử từ khoá ngắn hơn, hoặc gửi bài bạn đang tìm." : "Gửi bài đầu tiên để mở hàng."}
            </p>
            <Button asChild className="mt-6 rounded-full">
              <a href={STUDIO_URL}>
                <PenLine /> Đóng góp bài
              </a>
            </Button>
          </div>
        ) : (
          <>
            <InstrumentTabs counts={byTab} total={base.length} selection={selection} onChange={select} />
            {selection.tab === "others" && (others.length > 0 || selection.instrument) ? (
              <OtherInstrumentChips items={others} total={byTab.others.length} value={selection.instrument} onChange={select} />
            ) : (
              <div className="mb-8" />
            )}
            {selection.tab || searching ? (
              <SongSection title={listTitle} songs={list} />
            ) : (
              <div className="space-y-12">
                {LIBRARY_TABS.filter((t) => byTab[t.id].length).map((t) => (
                  <SongSection key={t.id} title={t.label} songs={byTab[t.id]} onMore={() => select({ tab: t.id, instrument: null })} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function InstrumentTabs({
  counts,
  total,
  selection,
  onChange,
}: {
  counts: Record<LibraryTab, SongSummary[]>;
  total: number;
  selection: LibrarySelection;
  onChange: (next: LibrarySelection) => void;
}) {
  const tabs: { id: LibraryTab | null; label: string; count: number }[] = [
    { id: null, label: "Tất cả", count: total },
    ...LIBRARY_TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id].length })),
  ];
  return (
    <nav aria-label="Nhạc cụ" className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => {
          const active = selection.tab === t.id;
          // clicking the active tab clears it; inside "others" with an instrument picked it first widens back to the whole group
          const next: LibrarySelection =
            active && t.id && !selection.instrument ? { tab: null, instrument: null } : { tab: t.id, instrument: null };
          return (
            <li key={t.id ?? "all"}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(next)}
                className={cn(
                  "flex items-baseline gap-2 rounded-full border px-4 py-2 font-display text-base font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/40",
                )}
              >
                {t.label}
                <span className={cn("font-sans text-xs font-medium tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{t.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Second row under "Nhạc cụ khác": narrow down to one instrument (guitar, piano…) or to unclassified songs */
function OtherInstrumentChips({
  items,
  total,
  value,
  onChange,
}: {
  items: { id: InstrumentFilter; count: number }[];
  total: number;
  value: InstrumentFilter | null;
  onChange: (next: LibrarySelection) => void;
}) {
  // an old link may point to an instrument with no matching songs: keep its chip so the selection stays visible
  const chips = value && !items.some((i) => i.id === value) ? [...items, { id: value, count: 0 }] : items;
  const all: { id: InstrumentFilter | null; count: number }[] = [{ id: null, count: total }, ...chips];
  return (
    <div role="group" aria-label="Lọc trong nhạc cụ khác" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5">
        {all.map((c) => {
          const active = value === c.id;
          return (
            <li key={c.id ?? "all"}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ tab: "others", instrument: c.id })}
                className={cn(
                  "flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {c.id ? filterLabel(c.id) : "Tất cả"}
                <span className={cn("text-xs tabular-nums", active ? "opacity-75" : "text-muted-foreground/80")}>{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One instrument section. The overview shows the first 6 songs with a "see all" button. */
function SongSection({ title, songs, onMore }: { title: string; songs: SongSummary[]; onMore?: () => void }) {
  const LIMIT = 6;
  const shown = onMore ? songs.slice(0, LIMIT) : songs;
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <span className="text-base font-medium text-muted-foreground tabular-nums">{songs.length} bài</span>
        {onMore && songs.length > LIMIT && (
          <button type="button" onClick={onMore} className="ml-auto text-sm font-medium text-primary underline-offset-4 hover:underline">
            Xem cả {songs.length} bài
          </button>
        )}
      </div>
      {shown.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed py-10 text-center text-muted-foreground">Chưa có bài nào cho nhạc cụ này khớp bộ lọc.</p>
      )}
    </section>
  );
}

/** `preview`: Studio previews an unpublished card — not a link */
export function SongCard({ song: s, preview = false }: { song: SongSummary; preview?: boolean }) {
  const cardClass =
    "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none motion-reduce:hover:translate-y-0";
  const body = (
    <>
      <div className="border-b bg-muted/50 px-4 pt-4 pb-1 sm:pt-5">
        <SongMotif seed={s.id} />
      </div>
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <span className="font-display text-[1.4rem] leading-tight font-bold text-balance">{s.title}</span>
        {s.artist && <span className="mt-1 truncate text-sm text-muted-foreground">{s.artist}</span>}
        <span className="mt-auto flex items-center gap-2 pt-3 text-sm sm:pt-4 text-muted-foreground">
          {s.instruments.slice(0, 2).map((i) => (
            <span key={i} className="truncate rounded-full border px-2.5 py-0.5 text-foreground/80">
              {instrumentLabel(i)}
            </span>
          ))}
          {s.instruments.length > 2 && (
            <span className="shrink-0 text-xs" title={s.instruments.slice(2).map(instrumentLabel).join(", ")}>
              +{s.instruments.length - 2}
            </span>
          )}
          {s.key && (
            <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80" title={`Tone ${s.key}`}>
              {formatKeyName(s.key)}
            </span>
          )}
          <span className={cn("flex shrink-0 items-center gap-1.5", !s.key && "ml-auto")} title={s.kind === "text" ? "Bài dạng chữ" : "Bài dạng ảnh"}>
            {s.kind === "text" ? <Type className="size-4" /> : <FileImage className="size-4" />}
            {s.kind === "text" ? "Chữ" : `${s.pageCount} ảnh`}
          </span>
        </span>
      </div>
    </>
  );
  return (
    <li>
      {preview ? (
        <div className={cardClass}>{body}</div>
      ) : (
        <Link to={`/s/${s.id}`} className={cardClass}>
          {body}
        </Link>
      )}
    </li>
  );
}
