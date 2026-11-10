import { Link } from "react-router";
import { FileImage, Type } from "lucide-react";
import type { SongSummary } from "@shared/types";
import { instrumentLabel } from "@shared/instruments";
import { StatusBadge } from "./StatusBadge";

const fmt = (t: number) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function SongTable({ songs, showOwner = false, empty }: { songs: SongSummary[]; showOwner?: boolean; empty: React.ReactNode }) {
  if (!songs.length) return <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {songs.map((s) => (
        <li key={s.id}>
          <Link to={`/songs/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              {s.kind === "text" ? <Type className="size-4" /> : <FileImage className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[s.artist, s.instruments.map(instrumentLabel).join(", "), s.kind === "sheet" ? `${s.pageCount} ảnh` : null, showOwner ? (s.owner?.name || s.owner?.email || "Không rõ người đăng") : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {s.status === "rejected" && s.reviewNote && (
                <span className="mt-1 block truncate text-xs text-red-600 dark:text-red-400">Lý do: {s.reviewNote}</span>
              )}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">{fmt(s.updatedAt)}</span>
            {s.status && <StatusBadge status={s.status} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
