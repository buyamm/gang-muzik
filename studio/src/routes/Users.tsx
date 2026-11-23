import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen } from "lucide-react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { api, type UserWithStats } from "@studio/lib/api";

/** Table rows need an index signature; a mapped type provides one */
type UserRow = { [K in keyof UserWithStats]: UserWithStats[K] };

/** dev-login accounts use the email as their name: show it once */
const hasOwnName = (u: UserRow) => !!u.name && u.name !== u.email;

const fmt = (t: number) =>
  new Date(t).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });

/** Users page (Astryx template "table"): one flat table with a ban / unban action per row. */
export function Users() {
  const qc = useQueryClient();
  const showToast = useToast();
  const isNarrow = useMediaQuery("(max-width: 768px)");
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

  const badges = (u: UserRow) => (
    <>
      {u.role === "admin" && <Badge variant="info" label="Quản trị" />}
      {u.status === "banned" && <Badge variant="error" label="Đã khoá" />}
    </>
  );

  const columns: (TableColumn<UserRow> | false)[] = [
    {
      key: "name",
      header: "Người dùng",
      width: proportional(1),
      renderCell: (u) => (
        <HStack gap={3} vAlign="center">
          <Avatar src={u.avatarUrl || undefined} name={u.name || u.email} size="md" tooltip={false} />
          <StackItem size="fill">
            <VStack gap={0.5}>
              <Text maxLines={1}>{u.name || u.email}</Text>
              {(hasOwnName(u) || isNarrow) && (
                <HStack gap={1.5} vAlign="center">
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {[hasOwnName(u) ? u.email : "", isNarrow ? `${u.songCount} bài` : ""].filter(Boolean).join(" · ")}
                  </Text>
                  {isNarrow && badges(u)}
                </HStack>
              )}
            </VStack>
          </StackItem>
        </HStack>
      ),
    },
    !isNarrow && {
      key: "role",
      header: "Vai trò",
      width: pixel(168),
      renderCell: (u) => (
        <HStack gap={1.5} vAlign="center">
          {u.role === "admin" || u.status === "banned" ? badges(u) : <Text color="secondary">Người đóng góp</Text>}
        </HStack>
      ),
    },
    !isNarrow && {
      key: "songCount",
      header: "Bài (đã duyệt)",
      width: pixel(128),
      align: "end",
      renderCell: (u) => <Text>{`${u.songCount} (${u.approvedCount})`}</Text>,
    },
    !isNarrow && {
      key: "lastLoginAt",
      header: "Đăng nhập gần nhất",
      width: pixel(168),
      renderCell: (u) => (
        <Text type="supporting" color="secondary">
          {fmt(u.lastLoginAt)}
        </Text>
      ),
    },
    {
      key: "actions",
      header: <VisuallyHidden>Thao tác</VisuallyHidden>,
      width: pixel(isNarrow ? 56 : 128),
      align: "end",
      // phones: icon-only buttons (the label stays as the accessible name and tooltip)
      renderCell: (u) =>
        u.role === "admin" ? null : u.status === "banned" ? (
          <Button
            size="sm"
            label="Mở khoá"
            tooltip={isNarrow ? "Mở khoá" : undefined}
            isIconOnly={isNarrow}
            icon={<Icon icon={LockOpen} size="sm" />}
            isDisabled={ban.isPending}
            onClick={() => ban.mutate({ id: u.id, banned: false })}
          />
        ) : (
          <Button
            size="sm"
            variant="destructive"
            label="Khoá"
            tooltip={isNarrow ? "Khoá tài khoản" : undefined}
            isIconOnly={isNarrow}
            icon={<Icon icon={Lock} size="sm" />}
            isDisabled={ban.isPending}
            onClick={() => setConfirm({ id: u.id, email: u.email })}
          />
        ),
    },
  ];

  return (
    <>
      <title>Người dùng · Gang Muzik Studio</title>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={4}>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={1}>Người dùng</Heading>
                <Text type="body" color="secondary">
                  Khoá tài khoản sẽ đăng xuất người đó ngay và gỡ các bài đang chờ duyệt của họ.
                </Text>
              </VStack>
              {q.isSuccess && (
                <Text type="supporting" color="secondary">
                  {`${q.data.length} người dùng`}
                </Text>
              )}
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent role="main" padding={0}>
            {q.isError ? (
              <VStack padding={4}>
                <Banner status="error" title="Không tải được dữ liệu" description={q.error.message} />
              </VStack>
            ) : !q.isSuccess ? (
              <Center axis="both" padding={10}>
                <Spinner size="xl" aria-label="Đang tải" />
              </Center>
            ) : (
              <Table<UserRow>
                data={q.data}
                columns={columns.filter((c): c is TableColumn<UserRow> => !!c)}
                idKey="id"
                density="balanced"
                dividers="rows"
                textOverflow="truncate"
                hasHover
              />
            )}
          </LayoutContent>
        }
      />
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
    </>
  );
}
