import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, AudioLines, FileImage, Hand, Music2, PenLine, Type } from "lucide-react";
import type { SongKind, SongSummary } from "@shared/types";
import { instrumentLabel } from "@shared/instruments";
import { homeSeo } from "@shared/seo";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { OverflowList } from "@astryxdesign/core/OverflowList";
import { Section } from "@astryxdesign/core/Section";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { AppFrame } from "@/components/AppFrame";
import { SongMotif } from "@/components/brand/Staff";
import { api } from "@/lib/api";
import { STUDIO_URL } from "@/lib/links";
import { formatKeyName } from "@/lib/notation/transpose";
import {
  LIBRARY_TABS,
  UNCLASSIFIED_LABEL,
  groupByTab,
  matchesSelection,
  otherInstrumentCounts,
  parseInstrumentParam,
  selectionToParam,
  type InstrumentFilter,
  type LibrarySelection,
  type LibraryTab,
} from "@/lib/library/tabs";
import { useSeo } from "@/lib/seo";

const KINDS: { value: SongKind | "all"; label: string }[] = [
  { value: "all", label: "Mọi dạng bài" },
  { value: "text", label: "Dạng chữ" },
  { value: "sheet", label: "Ảnh / sheet" },
];

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const ALL = "all";
const OVERVIEW_LIMIT = 6;
const tabLabel = (tab: LibraryTab) => LIBRARY_TABS.find((t) => t.id === tab)!.label;
const filterLabel = (id: InstrumentFilter) => (id === "none" ? UNCLASSIFIED_LABEL : instrumentLabel(id));

/** Library home (Astryx template "library"): header, search + filters, sections of uniform song cards. */
export function Library() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SongKind | "all">("all");
  const songs = useQuery({ queryKey: ["songs"], queryFn: api.listSongs });
  // the selected tab lives in the URL (?instrument=sax) so links can be shared; old ?instrument=guitar links still work
  const [params, setParams] = useSearchParams();
  const param = params.get("instrument");
  const selection = useMemo(() => parseInstrumentParam(param), [param]);
  const select = (next: LibrarySelection) =>
    setParams(
      (p) => {
        const v = selectionToParam(next);
        if (v) p.set("instrument", v);
        else p.delete("instrument");
        return p;
      },
      { replace: true },
    );

  /** filtered by text + song kind (not by instrument yet): used for the per-tab counts */
  const base = useMemo(() => {
    const q = strip(query.trim());
    return (songs.data ?? []).filter(
      (s) =>
        (kind === "all" || s.kind === kind) &&
        (!q || strip(`${s.title} ${s.artist} ${s.instruments.map(instrumentLabel).join(" ")}`).includes(q)),
    );
  }, [songs.data, query, kind]);

  const byTab = useMemo(() => groupByTab(base), [base]);
  const others = useMemo(() => otherInstrumentCounts(byTab.others), [byTab]);
  const list = useMemo(() => base.filter((s) => matchesSelection(s.instruments, selection)), [base, selection]);
  const searching = !!query.trim() || kind !== "all";
  useSeo(homeSeo(selection.tab === "others" ? (selection.instrument === "none" ? null : selection.instrument) : selection.tab));

  const tabs: { id: LibraryTab | null; label: string; count: number }[] = [
    { id: null, label: "Tất cả", count: base.length },
    ...LIBRARY_TABS.map((t) => ({ id: t.id, label: t.label, count: byTab[t.id].length })),
  ];
  const sections: { key: string; title: string; songs: SongSummary[]; onMore?: () => void }[] =
    selection.tab || searching
      ? [
          {
            key: "result",
            title: selection.instrument ? filterLabel(selection.instrument) : selection.tab ? tabLabel(selection.tab) : "Kết quả tìm kiếm",
            songs: list,
          },
        ]
      : LIBRARY_TABS.filter((t) => byTab[t.id].length).map((t) => ({
          key: t.id,
          title: t.label,
          songs: byTab[t.id],
          onMore: () => select({ tab: t.id, instrument: null }),
        }));

  return (
    <AppFrame>
      <Layout
        height="auto"
        header={
          <LayoutHeader hasDivider padding={6}>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={1}>Thư viện</Heading>
                <Text color="secondary">Sheet nhạc và cảm âm tự cuộn, tự lật trang. Có pedal thì lật bằng chân.</Text>
              </VStack>
              <Grid columns={{ minWidth: 260, max: 2 }} gap={3}>
                <Shortcut href="/fingering" icon={Hand} title="Tra thế bấm" text="Xem cách bấm từng nốt cho sax và sáo trúc" />
                <Shortcut href="/practice" icon={AudioLines} title="Luyện gam" text="Chạy gam, nốt dài theo nhịp và drone" />
              </Grid>
            </VStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent role="main" padding={6}>
            <VStack gap={6}>
              <VStack gap={4}>
                <TextInput
                  type="search"
                  label="Tìm bài theo tên, ca sĩ hoặc nhạc cụ"
                  isLabelHidden
                  placeholder="Tìm bài để tập sax, sáo…"
                  value={query}
                  onChange={setQuery}
                  startIcon="search"
                  hasClear
                  size="lg"
                />
                {/* phones: the kind menu drops below the instrument filter */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <VStack>
                      <ToggleButtonGroup
                        label="Lọc theo nhạc cụ"
                        value={selection.tab ?? ALL}
                        onChange={(v) => typeof v === "string" && select({ tab: v === ALL ? null : (v as LibraryTab), instrument: null })}
                      >
                        <OverflowList
                          gap={1}
                          minVisibleItems={2}
                          behavior="observeParent"
                          overflowRenderer={(items) => (
                            <DropdownMenu
                              button={{ label: `+${items.length}`, variant: "ghost", size: "lg" }}
                              items={items.map(({ index }) => ({
                                label: tabs[index].label,
                                onClick: () => select({ tab: tabs[index].id, instrument: null }),
                              }))}
                            />
                          )}
                        >
                          {tabs.map((t) => (
                            <ToggleButton key={t.id ?? ALL} value={t.id ?? ALL} label={`${t.label} (${t.count})`} size="lg">
                              {t.label} <span className="ml-1 tabular-nums opacity-60">{t.count}</span>
                            </ToggleButton>
                          ))}
                        </OverflowList>
                      </ToggleButtonGroup>
                    </VStack>
                  </div>
                  <div className="self-start sm:self-auto">
                    <DropdownMenu
                      button={{ label: KINDS.find((k) => k.value === kind)!.label, size: "lg" }}
                      alignment="end"
                      items={KINDS.map((k) => ({ label: k.label, onClick: () => setKind(k.value) }))}
                    />
                  </div>
                </div>
                {selection.tab === "others" && (others.length > 0 || selection.instrument) && (
                  <OtherInstruments items={others} total={byTab.others.length} value={selection.instrument} onChange={select} />
                )}
              </VStack>

              {songs.isPending ? (
                <Grid columns={{ minWidth: 280, max: 6 }} gap={4}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="h-56">
                      <Skeleton index={i} radius={4} />
                    </div>
                  ))}
                </Grid>
              ) : songs.isError ? (
                <Banner status="error" title="Không tải được thư viện" description={`${songs.error.message}. Tải lại trang để thử lần nữa.`} />
              ) : !songs.data.length ? (
                <EmptyState
                  icon={<Icon icon={Music2} size="lg" />}
                  title="Thư viện còn trống"
                  description="Gửi bài đầu tiên để mở hàng."
                  actions={<Button href={STUDIO_URL} variant="primary" label="Đóng góp bài" icon={<Icon icon={PenLine} />} />}
                />
              ) : sections.every((s) => !s.songs.length) ? (
                <Center>
                  <VStack gap={2} hAlign="center">
                    <Text type="supporting" color="secondary">
                      Không có bài nào khớp. Thử từ khoá ngắn hơn, hoặc gửi bài bạn đang tìm.
                    </Text>
                    <Button href={STUDIO_URL} variant="ghost" label="Đóng góp bài" icon={<Icon icon={PenLine} />} />
                  </VStack>
                </Center>
              ) : (
                <VStack gap={6}>
                  {sections.flatMap((sec) => [
                    <Divider key={`d-${sec.key}`} />,
                    <SongSection key={sec.key} title={sec.title} songs={sec.songs} onMore={sec.onMore} />,
                  ])}
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </AppFrame>
  );
}

function Shortcut({ href, icon, title, text }: { href: string; icon: typeof Hand; title: string; text: string }) {
  return (
    <ClickableCard href={href} label={title} padding={4}>
      <HStack gap={3} vAlign="center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon icon={icon} />
        </span>
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Text weight="semibold">{title}</Text>
            <Text type="supporting" color="secondary">
              {text}
            </Text>
          </VStack>
        </StackItem>
        <Icon icon={ArrowRight} size="sm" color="secondary" />
      </HStack>
    </ClickableCard>
  );
}

/** Under "Nhạc cụ khác": narrow down to one instrument (guitar, piano…) or to unclassified songs */
function OtherInstruments({
  items,
  total,
  value,
  onChange,
}: {
  items: { id: InstrumentFilter; count: number }[];
  total: number;
  value: InstrumentFilter | null;
  onChange: (next: LibrarySelection) => void;
}) {
  // an old link may point to an instrument with no matching songs: keep its chip so the selection stays visible
  const chips = value && !items.some((i) => i.id === value) ? [...items, { id: value, count: 0 }] : items;
  const all: { id: InstrumentFilter | null; count: number }[] = [{ id: null, count: total }, ...chips];
  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <ToggleButtonGroup
        label="Lọc trong nhạc cụ khác"
        size="sm"
        value={value ?? ALL}
        onChange={(v) => typeof v === "string" && onChange({ tab: "others", instrument: v === ALL ? null : (v as InstrumentFilter) })}
      >
        {all.map((c) => {
          const label = c.id ? filterLabel(c.id) : "Mọi nhạc cụ khác";
          return (
            <ToggleButton key={c.id ?? ALL} value={c.id ?? ALL} label={`${label} (${c.count})`}>
              {label} <span className="ml-1 tabular-nums opacity-60">{c.count}</span>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}

/** One section: heading + grid of uniform tiles. The overview shows the first few with a "see all" button. */
function SongSection({ title, songs, onMore }: { title: string; songs: SongSummary[]; onMore?: () => void }) {
  const shown = onMore ? songs.slice(0, OVERVIEW_LIMIT) : songs;
  return (
    <VStack gap={6}>
      <HStack gap={3} vAlign="center">
        <Heading level={2}>{title}</Heading>
        <Badge label={songs.length} />
        {onMore && songs.length > OVERVIEW_LIMIT && (
          <span className="ml-auto">
            <Button variant="ghost" label={`Xem cả ${songs.length} bài`} onClick={onMore} />
          </span>
        )}
      </HStack>
      {shown.length ? (
        <Grid columns={{ minWidth: 280, max: 6 }} gap={4}>
          {shown.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </Grid>
      ) : (
        <Text type="supporting" color="secondary">
          Chưa có bài nào cho nhạc cụ này khớp bộ lọc.
        </Text>
      )}
    </VStack>
  );
}

/** Uniform song tile (template LibraryCard). `preview`: Studio shows an unpublished card, not a link. */
export function SongCard({ song: s, preview = false }: { song: SongSummary; preview?: boolean }) {
  const body = (
    <>
      <div className="border-b border-border bg-muted px-4 pt-4 pb-1">
        <SongMotif seed={s.id} />
      </div>
      <Section variant="transparent" padding={4}>
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={3} maxLines={2}>
              {s.title}
            </Heading>
            <Text type="body" size="sm" color="secondary" maxLines={1}>
              {s.artist || "Chưa rõ tác giả"}
            </Text>
          </VStack>
          <HStack gap={1.5} vAlign="center" wrap="wrap">
            {s.instruments.slice(0, 2).map((i) => (
              <Token key={i} size="sm" label={instrumentLabel(i)} />
            ))}
            {s.instruments.length > 2 && (
              <Token size="sm" label={`+${s.instruments.length - 2}`} description={s.instruments.slice(2).map(instrumentLabel).join(", ")} />
            )}
            {s.key && <Token size="sm" color="gray" label={formatKeyName(s.key)} description={`Tone ${s.key}`} />}
            <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground" title={s.kind === "text" ? "Bài dạng chữ" : "Bài dạng ảnh"}>
              <Icon icon={s.kind === "text" ? Type : FileImage} size="sm" />
              {s.kind === "text" ? "Chữ" : `${s.pageCount} ảnh`}
            </span>
          </HStack>
        </VStack>
      </Section>
    </>
  );
  return preview ? (
    <Card padding={0}>{body}</Card>
  ) : (
    <ClickableCard href={`/s/${s.id}`} label={s.artist ? `${s.title} — ${s.artist}` : s.title} padding={0} height="100%">
      {body}
    </ClickableCard>
  );
}
