import { useQuery } from "@tanstack/react-query";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";
import { PageHeader, QueryFallback } from "@studio/components/PageHeader";

export function Review() {
  const q = useQuery({ queryKey: ["songs", "all", "pending"], queryFn: () => api.listSongs({ scope: "all", status: "pending" }) });
  return (
    <div className="space-y-6">
      <title>Chờ duyệt · Gang Muzik Studio</title>
      <PageHeader title="Chờ duyệt" description="Bài cũ nhất ở trên. Mở từng bài để xem trước, rồi Duyệt hoặc Từ chối (kèm lý do)." />
      {q.isSuccess ? <SongTable songs={q.data} showOwner empty="Không có bài nào đang chờ duyệt 🎉" /> : <QueryFallback error={q.error} />}
    </div>
  );
}
