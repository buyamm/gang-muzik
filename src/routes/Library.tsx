import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FileImage, PenLine, Search, Type } from "lucide-react";
import type { SongKind, SongSummary } from "@shared/types";
import { INSTRUMENTS, instrumentLabel, normalizeInstrument, type InstrumentId } from "@shared/instruments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark, SongMotif } from "@/components/brand/Staff";
import { api } from "@/lib/api";
import { STUDIO_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

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

export function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SongKind | "all">("all");
  const songs = useQuery({ queryKey: ["songs"], queryFn: api.listSongs });
  // nhạc cụ đang chọn nằm trên URL (?instrument=guitar) để chia sẻ link được
  const [params, setParams] = useSearchParams();
  const raw = params.get("instrument");
  const instrument: InstrumentId | "none" | null = raw === "none" ? "none" : raw ? normalizeInstrument(raw) || null : null;
  const pickInstrument = (id: InstrumentId | "none" | null) =>
    setParams(
      (p) => {
        if (id) p.set("instrument", id);
        else p.delete("instrument");
        return p;
      },
      { replace: true },
    );

  /** lọc theo chữ + dạng bài (chưa lọc nhạc cụ) — dùng để đếm số bài mỗi nhạc cụ */
  const base = useMemo(() => {
    const q = strip(query.trim());
    return (songs.data ?? []).filter(
      (s) =>
        (filter === "all" || s.kind === filter) &&
        (!q || strip(`${s.title} ${s.artist} ${s.instruments.map(instrumentLabel).join(" ")}`).includes(q)),
    );
  }, [songs.data, query, filter]);

  const groups = useMemo(() => {
    const by = new Map<InstrumentId | "none", SongSummary[]>();
    // bài nhiều nhạc cụ hiện ở mọi mục tương ứng
    for (const s of base) {
      const ids: (InstrumentId | "none")[] = s.instruments.length ? (s.instruments as InstrumentId[]) : ["none"];
      for (const id of ids) by.set(id, [...(by.get(id) ?? []), s]);
    }
    const order: (InstrumentId | "none")[] = [...INSTRUMENTS.map((i) => i.id), "none"];
    return order
      .filter((id) => by.has(id))
      .map((id) => ({ id, label: id === "none" ? "Chưa phân loại" : instrumentLabel(id), songs: by.get(id)! }));
  }, [base]);

  const list = instrument ? (groups.find((g) => g.id === instrument)?.songs ?? []) : base;
  const searching = !!query.trim() || filter !== "all";

  return (
    <div className="min-h-full">
      <title>Gang Muzik · Thư viện</title>

      {/* tiêu đề gọn: chỉ để nhận ra trang, nhường chỗ cho danh sách bài */}
      <header className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="flex-1 font-display text-base font-bold">Gang Muzik</span>
          <Button asChild variant="ghost" size="sm" title="Đăng nhập bằng Google để gửi bài của bạn">
            <a href={STUDIO_URL}>
              <PenLine /> <span className="hidden sm:inline">Đóng góp bài</span>
            </a>
          </Button>
          <ThemeToggle />
        </div>

        <div className="mt-6 sm:mt-10">
          <div>
            <div className="staff-lines relative flex h-[calc(var(--staff-gap)*4+1px)] items-center [--staff-gap:10px] sm:[--staff-gap:13px]">
              <h1 className="font-display text-[2.6rem] leading-[0.9] font-extrabold tracking-tight [font-variation-settings:'wdth'_78] sm:text-[3.7rem]">
                Chọn bài, bấm chạy
              </h1>
            </div>
            <p className="mt-4 max-w-[36rem] text-pretty text-muted-foreground sm:text-lg">
              Sheet nhạc, cảm âm, hợp âm và tab tự cuộn hoặc tự lật trang. Có pedal thì lật bằng chân.
            </p>
          </div>
        </div>
      </header>

      {/* thanh tìm kiếm dính trên cùng khi cuộn danh sách */}
      <div className="sticky top-0 z-10 mt-6 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài, ca sĩ hoặc nhạc cụ"
              aria-label="Tìm bài"
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
            <InstrumentTabs groups={groups} total={base.length} value={instrument} onChange={pickInstrument} />
            {instrument || searching ? (
              <SongSection
                title={instrument ? (groups.find((g) => g.id === instrument)?.label ?? instrumentLabel(instrument)) : "Kết quả"}
                songs={list}
              />
            ) : (
              <div className="space-y-12">
                {groups.map((g) => (
                  <SongSection key={g.id} title={g.label} songs={g.songs} onMore={() => pickInstrument(g.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Khi đang chơi: pedal Bluetooth hoặc phím <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>Space</Kbd>
          </span>
          <span className="flex shrink-0 gap-4">
            <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
              Quyền riêng tư
            </Link>
            <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
              Điều khoản
            </Link>
            <a href={STUDIO_URL} className="underline-offset-4 hover:text-foreground hover:underline">
              Studio
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function InstrumentTabs({
  groups,
  total,
  value,
  onChange,
}: {
  groups: { id: InstrumentId | "none"; label: string; songs: SongSummary[] }[];
  total: number;
  value: InstrumentId | "none" | null;
  onChange: (id: InstrumentId | "none" | null) => void;
}) {
  const tabs = [{ id: null, label: "Tất cả nhạc cụ", count: total }, ...groups.map((g) => ({ id: g.id, label: g.label, count: g.songs.length }))];
  return (
    <nav aria-label="Nhạc cụ" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <li key={t.id ?? "all"}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(active ? null : t.id)}
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

/** Một mục nhạc cụ. Ở trang tổng chỉ hiện 6 bài đầu, có nút xem hết. */
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

function SongCard({ song: s }: { song: SongSummary }) {
  return (
    <li>
      <Link
        to={`/s/${s.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none motion-reduce:hover:translate-y-0"
      >
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
            <span className="ml-auto flex shrink-0 items-center gap-1.5" title={s.kind === "text" ? "Bài dạng chữ" : "Bài dạng ảnh"}>
              {s.kind === "text" ? <Type className="size-4" /> : <FileImage className="size-4" />}
              {s.kind === "text" ? "Chữ" : `${s.pageCount} ảnh`}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-6 justify-center rounded border border-b-2 bg-card px-1.5 py-px font-sans text-xs text-foreground">
      {children}
    </kbd>
  );
}
