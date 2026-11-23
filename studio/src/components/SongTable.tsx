import { FileImage, FileMusic, Type } from "lucide-react";
import type { SongSummary } from "@shared/types";
import { instrumentLabel } from "@shared/instruments";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusBadge } from "./StatusBadge";

const fmt = (t: number) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function SongTable({ songs, showOwner = false, empty }: { songs: SongSummary[]; showOwner?: boolean; empty: string }) {
  if (!songs.length)
    return (
      <Card padding={8}>
        <EmptyState isCompact icon={<Icon icon={FileMusic} size="lg" />} title={empty} />
      </Card>
    );
  return (
    <Card padding={0}>
      <List hasDividers density="spacious">
        {songs.map((s) => {
          const meta = [
            s.artist,
            s.instruments.map(instrumentLabel).join(", "),
            s.kind === "sheet" ? `${s.pageCount} ảnh` : null,
            showOwner ? s.owner?.name || s.owner?.email || "Không rõ người đăng" : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <ListItem
              key={s.id}
              href={`/songs/${s.id}`}
              label={s.title}
              description={
                <span className="block min-w-0">
                  <span className="block truncate">{meta}</span>
                  {s.status === "rejected" && s.reviewNote && (
                    <span className="mt-0.5 block truncate text-destructive">Lý do: {s.reviewNote}</span>
                  )}
                </span>
              }
              startContent={
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon icon={s.kind === "text" ? Type : FileImage} size="sm" />
                </span>
              }
              endContent={
                <span className="flex items-center gap-3">
                  <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">{fmt(s.updatedAt)}</span>
                  {s.status && <StatusBadge status={s.status} />}
                </span>
              }
            />
          );
        })}
      </List>
    </Card>
  );
}
