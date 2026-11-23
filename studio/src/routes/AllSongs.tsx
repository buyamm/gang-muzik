import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SongStatus } from "@shared/types";
import { STATUS_LABEL } from "@shared/permissions";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";
import { PageHeader, QueryFallback } from "@studio/components/PageHeader";

const FILTERS: (SongStatus | undefined)[] = [undefined, "pending", "approved", "rejected", "draft"];
const ANY = "any";

export function AllSongs() {
  const [status, setStatus] = useState<SongStatus | undefined>();
  const q = useQuery({ queryKey: ["songs", "all", status ?? ANY], queryFn: () => api.listSongs({ scope: "all", status }) });
  return (
    <div className="space-y-6">
      <title>Tất cả bài · Gang Muzik Studio</title>
      <PageHeader title="Tất cả bài" />
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <SegmentedControl label="Lọc theo trạng thái" value={status ?? ANY} onChange={(v) => setStatus(v === ANY ? undefined : (v as SongStatus))}>
          {FILTERS.map((f) => (
            <SegmentedControlItem key={f ?? ANY} value={f ?? ANY} label={f ? STATUS_LABEL[f] : "Tất cả"} />
          ))}
        </SegmentedControl>
      </div>
      {q.isSuccess ? <SongTable songs={q.data} showOwner empty="Không có bài nào." /> : <QueryFallback error={q.error} />}
    </div>
  );
}
