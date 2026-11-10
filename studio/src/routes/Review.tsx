import { useQuery } from "@tanstack/react-query";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";

export function Review() {
  const q = useQuery({ queryKey: ["songs", "all", "pending"], queryFn: () => api.listSongs({ scope: "all", status: "pending" }) });
  return (
    <div className="space-y-5">
      <title>Chờ duyệt · Gang Muzik Studio</title>
      <div>
        <h1 className="font-display text-2xl font-bold">Chờ duyệt</h1>
        <p className="text-sm text-muted-foreground">Bài cũ nhất ở trên. Mở từng bài để xem trước, rồi Duyệt hoặc Từ chối (kèm lý do).</p>
      </div>
      {q.isPending ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : q.isError ? <p className="text-destructive">{q.error.message}</p> : <SongTable songs={q.data} showOwner empty="Không có bài nào đang chờ duyệt 🎉" />}
    </div>
  );
}
