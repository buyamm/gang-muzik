import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FileImage, PenLine, Search, Type } from "lucide-react";
import type { SongKind, SongSummary } from "@shared/types";
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

  const list = useMemo(() => {
    const q = strip(query.trim());
    return (songs.data ?? []).filter(
      (s) =>
        (filter === "all" || s.kind === filter) &&
        (!q || strip(`${s.title} ${s.artist} ${s.instrument}`).includes(q)),
    );
  }, [songs.data, query, filter]);

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
        ) : list.length === 0 ? (
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
            <h2 className="mb-4 flex items-baseline gap-3 font-display text-2xl font-bold">
              {query || filter !== "all" ? "Kết quả" : "Thư viện"}
              <span className="text-base font-medium text-muted-foreground tabular-nums">
                {list.length === songs.data.length ? `${list.length} bài` : `${list.length} / ${songs.data.length} bài`}
              </span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <SongCard key={s.id} song={s} />
              ))}
            </ul>
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
            {s.instrument && <span className="truncate rounded-full border px-2.5 py-0.5 text-foreground/80">{s.instrument}</span>}
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
