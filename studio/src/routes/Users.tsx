import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@studio/lib/api";

const fmt = (t: number) => new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function Users() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const ban = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => api.setBanned(id, banned),
    onSuccess: (_, v) => {
      toast.success(v.banned ? "Đã khoá tài khoản" : "Đã mở khoá");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["songs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <title>Người dùng · Gang Muzik Studio</title>
      <div>
        <h1 className="font-display text-2xl font-bold">Người dùng</h1>
        <p className="text-sm text-muted-foreground">Khoá tài khoản sẽ đăng xuất người đó ngay và gỡ các bài đang chờ duyệt của họ.</p>
      </div>
      {q.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : q.isError ? (
        <p className="text-destructive">{q.error.message}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {q.data.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full" />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 font-bold">{(u.name || u.email)[0]?.toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {u.name || u.email}{" "}
                  {u.role === "admin" && <span className="ml-1 rounded bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">Quản trị</span>}
                  {u.status === "banned" && <span className="ml-1 rounded bg-red-500/15 px-1.5 text-[11px] font-semibold text-red-600">Đã khoá</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.songCount} bài ({u.approvedCount} đã duyệt) · đăng nhập {fmt(u.lastLoginAt)}
                </div>
              </div>
              {u.role !== "admin" && (
                <Button
                  size="sm"
                  variant={u.status === "banned" ? "outline" : "ghost"}
                  className={u.status === "banned" ? "" : "text-destructive"}
                  disabled={ban.isPending}
                  onClick={() => {
                    const banned = u.status !== "banned";
                    if (banned && !window.confirm(`Khoá tài khoản ${u.email}?`)) return;
                    ban.mutate({ id: u.id, banned });
                  }}
                >
                  {u.status === "banned" ? "Mở khoá" : "Khoá"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
