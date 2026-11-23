import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { FileImage, FileMusic, Search, Type } from "lucide-react";
import type { SongStatus, SongSummary } from "@shared/types";
import { STATUS_LABEL } from "@shared/permissions";
import { instrumentLabel } from "@shared/instruments";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table, pixel, proportional, useTableGroupedRows, type TableColumn, type TablePlugin } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { StatusBadge } from "./StatusBadge";

/** Table rows need an index signature; a mapped type of SongSummary provides one */
type SongRow = { [K in keyof SongSummary]: SongSummary[K] };

/** groups in reading order: what needs action first */
const STATUS_ORDER: SongStatus[] = ["pending", "rejected", "draft", "approved"];
const GROUP_ORDER = STATUS_ORDER.map((s) => STATUS_LABEL[s]);

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const ownerName = (s: SongRow) => s.owner?.name || s.owner?.email || "Không rõ";

const normalize = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");

function columns(showOwner: boolean, isNarrow: boolean): TableColumn<SongRow>[] {
  const all: (TableColumn<SongRow> | false)[] = [
    {
      key: "title",
      header: "Tên bài",
      width: proportional(1),
      renderCell: (s) => (
        <VStack gap={0.5}>
          <Link href={`/songs/${s.id}`}>{s.title}</Link>
          {(s.artist || isNarrow) && (
            <Text type="supporting" color="secondary" maxLines={1}>
              {isNarrow ? [s.artist, s.instruments.map(instrumentLabel).join(", ")].filter(Boolean).join(" · ") : s.artist}
            </Text>
          )}
          {s.status === "rejected" && s.reviewNote && (
            <Text type="supporting" maxLines={1} className="text-destructive">
              {`Lý do: ${s.reviewNote}`}
            </Text>
          )}
        </VStack>
      ),
    },
    !isNarrow && {
      key: "instruments",
      header: "Nhạc cụ",
      width: pixel(160),
      renderCell: (s) =>
        s.instruments.length ? (
          <Text maxLines={1}>{s.instruments.map(instrumentLabel).join(", ")}</Text>
        ) : (
          <Text type="supporting" color="secondary">
            Chưa phân loại
          </Text>
        ),
    },
    !isNarrow && {
      key: "kind",
      header: "Dạng",
      width: pixel(96),
      renderCell: (s) => (
        <HStack gap={1.5} vAlign="center">
          <Icon icon={s.kind === "text" ? Type : FileImage} size="sm" color="secondary" />
          <Text>{s.kind === "text" ? "Chữ" : `${s.pageCount} ảnh`}</Text>
        </HStack>
      ),
    },
    showOwner &&
      !isNarrow && {
        key: "owner",
        header: "Người đăng",
        width: pixel(160),
        renderCell: (s) => <Text maxLines={1}>{ownerName(s)}</Text>,
      },
    !isNarrow && {
      key: "updatedAt",
      header: "Cập nhật",
      width: pixel(112),
      renderCell: (s) => (
        <Text type="supporting" color="secondary">
          {fmtDate(s.updatedAt)}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: pixel(isNarrow ? 104 : 120),
      renderCell: (s) => (s.status ? <StatusBadge status={s.status} /> : null),
    },
  ];
  return all.filter((c): c is TableColumn<SongRow> => !!c);
}

/**
 * Song list page (Astryx template "table-grouped"): header with title, actions and search,
 * then one Table grouped by review status. A row click opens the editor.
 */
export function SongsTable({
  title,
  description,
  actions,
  query,
  showOwner = false,
  empty,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  query: UseQueryResult<SongSummary[]>;
  showOwner?: boolean;
  empty: { title: string; description?: string; actions?: ReactNode };
}) {
  const navigate = useNavigate();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const rows = useMemo<SongRow[]>(() => {
    const all = query.data ?? [];
    const q = normalize(search.trim());
    const hit = q
      ? all.filter((s) =>
          normalize([s.title, s.artist, showOwner ? (s.owner?.name ?? "") + " " + (s.owner?.email ?? "") : ""].join(" ")).includes(q),
        )
      : all;
    // grouping keeps first-seen order inside a group: sort by status, then newest first
    return [...hit].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status ?? "draft") - STATUS_ORDER.indexOf(b.status ?? "draft") || b.updatedAt - a.updatedAt,
    );
  }, [query.data, search, showOwner]);

  const grouped = useTableGroupedRows<SongRow>({
    data: rows,
    groupBy: (s) => STATUS_LABEL[s.status ?? "draft"],
    groupOrder: GROUP_ORDER,
    collapsedGroups: collapsed,
    onToggleGroup: (key) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    getRowKey: (s) => s.id,
    renderGroupHeader: (key, count) => (
      <HStack gap={2} vAlign="center">
        <Text weight="bold">{key}</Text>
        <Badge variant="neutral" label={String(count)} />
      </HStack>
    ),
  });

  // a click anywhere on a song row opens it; group header rows (empty id) keep their own toggle
  const openRow: TablePlugin<SongRow> = {
    transformBodyRow(props, s) {
      if (!s.id) return props;
      return {
        ...props,
        htmlProps: {
          ...props.htmlProps,
          className: "cursor-pointer",
          onClick: (e: React.MouseEvent) => {
            if ((e.target as HTMLElement).closest("a, button")) return;
            navigate(`/songs/${s.id}`);
          },
        },
      };
    },
  };

  const total = query.data?.length ?? 0;
  const isEmpty = query.isSuccess && total === 0;

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <title>{`${title} · Gang Muzik Studio`}</title>
          <VStack gap={4}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={1}>
                  <Heading level={1}>{title}</Heading>
                  {description && (
                    <Text type="body" color="secondary">
                      {description}
                    </Text>
                  )}
                </VStack>
              </StackItem>
              {actions}
            </HStack>
            {!isEmpty && (
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <TextInput
                    label="Tìm bài"
                    isLabelHidden
                    placeholder={showOwner ? "Tìm theo tên bài, tác giả, người đăng…" : "Tìm theo tên bài, tác giả…"}
                    startIcon={Search}
                    hasClear
                    value={search}
                    onChange={setSearch}
                    width="100%"
                  />
                </StackItem>
                {query.isSuccess && (
                  <Text type="supporting" color="secondary">
                    {search.trim() ? `${rows.length} / ${total} bài` : `${total} bài`}
                  </Text>
                )}
              </HStack>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          {query.isError ? (
            <VStack padding={4}>
              <Banner status="error" title="Không tải được dữ liệu" description={query.error.message} />
            </VStack>
          ) : !query.isSuccess ? (
            <Center axis="both" padding={10}>
              <Spinner size="xl" aria-label="Đang tải" />
            </Center>
          ) : isEmpty ? (
            <Center axis="both" padding={10}>
              <EmptyState
                icon={<Icon icon={FileMusic} size="lg" />}
                title={empty.title}
                description={empty.description}
                actions={empty.actions}
              />
            </Center>
          ) : (
            <Table<SongRow>
              data={grouped.data}
              columns={columns(showOwner, isNarrow)}
              idKey={grouped.idKey}
              density="balanced"
              dividers="rows"
              textOverflow="truncate"
              hasHover
              plugins={{ grouped: grouped.plugin, openRow }}
              emptyState={<EmptyState isCompact title="Không có bài nào khớp" description="Thử từ khoá khác." />}
            />
          )}
        </LayoutContent>
      }
    />
  );
}
