import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { FileImage, Music2, PenLine, Search, Type } from "lucide-react";
import type { SongKind } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <header className="mx-auto max-w-5xl px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Music2 className="size-3.5" /> guitar · piano · sáo · sax · violin · mọi nhạc cụ
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Gang <span className="text-primary">Muzik</span>
            </h1>
            <p className="mt-2 max-w-md text-muted-foreground">
              Sheet nhạc, cảm âm, hợp âm, tab — tự cuộn, tự lật trang hoặc lật bằng pedal. Hai tay cứ việc chơi.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="outline" title="Đăng nhập bằng Google để gửi bài của bạn">
              <a href={STUDIO_URL}>
                <PenLine /> <span className="hidden sm:inline">Đóng góp bài</span>
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài, ca sĩ, nhạc cụ…"
              className="h-11 pl-9"
              type="search"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                  filter === f.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {songs.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : songs.isError ? (
          <p className="py-16 text-center text-destructive">Không tải được thư viện: {songs.error.message}</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <p className="font-display text-xl font-semibold">
              {songs.data.length ? "Không có bài nào khớp" : "Thư viện còn trống"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Có bài muốn chia sẻ? Bấm “Đóng góp bài” để gửi.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group relative"
              >
                <Link
                  to={`/s/${s.id}`}
                  className="flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {s.kind === "text" ? <Type className="size-3" /> : <FileImage className="size-3" />}
                    {s.kind === "text" ? "Dạng chữ" : `${s.pageCount} ảnh`}
                  </span>
                  <span className="font-display text-lg leading-snug font-semibold text-balance">{s.title}</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {[s.artist, s.instrument].filter(Boolean).join(" · ") || " "}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </main>

      <footer className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <span>Mẹo: pedal Bluetooth hoặc phím ← → Space để điều khiển khi đang chơi.</span>
        <a href={STUDIO_URL} className="shrink-0 underline-offset-4 hover:underline">
          Studio
        </a>
      </footer>
    </div>
  );
}
