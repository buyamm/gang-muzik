import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";
import { useMe } from "@studio/hooks/useMe";

export function MySongs() {
  const { user } = useMe();
  const q = useQuery({ queryKey: ["songs", "mine"], queryFn: () => api.listSongs({ scope: "mine" }) });
  return (
    <div className="space-y-5">
      <title>Bài của tôi · Gang Muzik Studio</title>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Xin chào{user?.name ? `, ${user.name}` : ""}!</h1>
          <p className="text-sm text-muted-foreground">
            Tạo bài → bấm <b>Gửi duyệt</b> → bài lên thư viện công khai khi quản trị viên duyệt.
          </p>
        </div>
        <Button asChild>
          <Link to="/songs/new">
            <Plus /> Bài mới
          </Link>
        </Button>
      </div>
      {q.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : q.isError ? (
        <p className="text-destructive">{q.error.message}</p>
      ) : (
        <SongTable songs={q.data} empty="Bạn chưa có bài nào. Bấm “Bài mới” để bắt đầu." />
      )}
    </div>
  );
}
