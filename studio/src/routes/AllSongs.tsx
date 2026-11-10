import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SongStatus } from "@shared/types";
import { STATUS_LABEL } from "@shared/permissions";
import { cn } from "@/lib/utils";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";

const FILTERS: (SongStatus | undefined)[] = [undefined, "pending", "approved", "rejected", "draft"];

export function AllSongs() {
  const [status, setStatus] = useState<SongStatus | undefined>();
  const q = useQuery({ queryKey: ["songs", "all", status ?? "any"], queryFn: () => api.listSongs({ scope: "all", status }) });
  return (
    <div className="space-y-5">
      <title>Tất cả bài · Gang Muzik Studio</title>
      <h1 className="font-display text-2xl font-bold">Tất cả bài</h1>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f ?? "all"}
            onClick={() => setStatus(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              status === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f ? STATUS_LABEL[f] : "Tất cả"}
          </button>
        ))}
      </div>
      {q.isPending ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : q.isError ? <p className="text-destructive">{q.error.message}</p> : <SongTable songs={q.data} showOwner empty="Không có bài nào." />}
    </div>
  );
}
