import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { List, ListItem } from "@astryxdesign/core/List";
import { useToast } from "@astryxdesign/core/Toast";
import { api } from "@studio/lib/api";
import { PageHeader, QueryFallback } from "@studio/components/PageHeader";

const fmt = (t: number) => new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function Users() {
  const qc = useQueryClient();
  const showToast = useToast();
  const [confirm, setConfirm] = useState<{ id: string; email: string } | null>(null);
  const q = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const ban = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => api.setBanned(id, banned),
    onSuccess: (_, v) => {
      showToast({ body: v.banned ? "Đã khoá tài khoản" : "Đã mở khoá" });
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["songs"] });
    },
    onError: (e) => showToast({ body: e.message, type: "error" }),
  });

  return (
    <div className="space-y-6">
      <title>Người dùng · Gang Muzik Studio</title>
      <PageHeader title="Người dùng" description="Khoá tài khoản sẽ đăng xuất người đó ngay và gỡ các bài đang chờ duyệt của họ." />
      {q.isSuccess ? (
        <Card padding={0}>
          <List hasDividers density="spacious">
            {q.data.map((u) => (
              <ListItem
                key={u.id}
                startContent={<Avatar src={u.avatarUrl ?? undefined} name={u.name || u.email} size="md" tooltip={false} />}
                label={
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{u.name || u.email}</span>
                    {u.role === "admin" && <Badge variant="info" label="Quản trị" />}
                    {u.status === "banned" && <Badge variant="error" label="Đã khoá" />}
                  </span>
                }
                description={`${u.email} · ${u.songCount} bài (${u.approvedCount} đã duyệt) · đăng nhập ${fmt(u.lastLoginAt)}`}
                endContent={
                  u.role !== "admin" &&
                  (u.status === "banned" ? (
                    <Button size="sm" label="Mở khoá" isDisabled={ban.isPending} onClick={() => ban.mutate({ id: u.id, banned: false })} />
                  ) : (
                    <Button size="sm" variant="destructive" label="Khoá" isDisabled={ban.isPending} onClick={() => setConfirm({ id: u.id, email: u.email })} />
                  ))
                }
              />
            ))}
          </List>
        </Card>
      ) : (
        <QueryFallback error={q.error} />
      )}
      <AlertDialog
        isOpen={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Khoá tài khoản?"
        description={confirm ? `${confirm.email} sẽ bị đăng xuất ngay và các bài đang chờ duyệt của họ bị gỡ.` : ""}
        actionLabel="Khoá"
        cancelLabel="Huỷ"
        isActionLoading={ban.isPending}
        onAction={() => confirm && ban.mutate({ id: confirm.id, banned: true })}
      />
    </div>
  );
}
