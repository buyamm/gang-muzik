import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, FileImage, Hand, Music2, PenLine, Type } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import type { SongKind, SongSummary } from "@shared/types";
import { instrumentLabel } from "@shared/instruments";
import { SongMotif } from "@/components/brand/Staff";
import { api } from "@/lib/api";
import { STUDIO_URL } from "@/lib/links";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
import { cn } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { homeSeo } from "@shared/seo";

const FILTERS: { value: SongKind | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "text", label: "Dạng chữ" },
  { value: "sheet", label: "Ảnh / Sheet" },
];

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const tabLabel = (tab: LibraryTab) => LIBRARY_TABS.find((t) => t.id === tab)!.label;
const filterLabel = (id: InstrumentFilter) => (id === "none" ? UNCLASSIFIED_LABEL : instrumentLabel(id));

export function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SongKind | "all">("all");
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

  /** filtered by text + song kind (not by instrument yet) — used for the per-tab counts */
  const base = useMemo(() => {
    const q = strip(query.trim());
    return (songs.data ?? []).filter(
      (s) =>
        (filter === "all" || s.kind === filter) &&
        (!q || strip(`${s.title} ${s.artist} ${s.instruments.map(instrumentLabel).join(" ")}`).includes(q)),
    );
  }, [songs.data, query, filter]);

  const byTab = useMemo(() => groupByTab(base), [base]);
  const others = useMemo(() => otherInstrumentCounts(byTab.others), [byTab]);
  const list = useMemo(() => base.filter((s) => matchesSelection(s.instruments, selection)), [base, selection]);
  const searching = !!query.trim() || filter !== "all";
  useSeo(homeSeo(selection.tab === "others" ? (selection.instrument === "none" ? null : selection.instrument) : selection.tab));

  const listTitle = selection.instrument ? filterLabel(selection.instrument) : selection.tab ? tabLabel(selection.tab) : "Kết quả";

  return (
    <div className="min-h-full">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16" aria-labelledby="hero-title">
        <VStack gap={4} hAlign="start">
          <h1 id="hero-title" className="font-display text-[2.25rem] leading-[1.02] font-bold tracking-tight min-[400px]:text-[2.6rem] sm:text-[3.6rem]">
            <span className="staff-lines flex h-[calc(var(--staff-gap)*4+1px)] items-center [--staff-gap:9px] min-[400px]:[--staff-gap:10px] sm:[--staff-gap:13px]">
              Học sax & sáo trúc,
            </span>
            <span className="mt-2 block text-muted-foreground sm:mt-3">bấm chạy là thổi</span>
          </h1>
          <Text type="large" color="secondary" as="p" textWrap="pretty">
            <span className="block max-w-[38rem]">
              Tra thế bấm từng nốt, luyện gam theo nhịp, rồi mở bài để sheet và cảm âm tự cuộn. Có pedal thì lật trang bằng chân.
            </span>
          </Text>
          <HStack gap={2} wrap="wrap">
            <Button href="/fingering" variant="primary" size="lg" label="Tra thế bấm" icon={<Icon icon={Hand} />} />
            <Button href="/practice" size="lg" label="Luyện gam" icon={<Icon icon={AudioLines} />} />
          </HStack>
        </VStack>
      </section>

      {/* search bar sticks to the top while scrolling the list */}
      <div className="sticky top-0 z-10 mt-10 border-b border-border bg-background/85 backdrop-blur-md sm:mt-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <div className="flex-1">
            <TextInput
              type="search"
              size="lg"
              label="Tìm bài theo tên, ca sĩ hoặc nhạc cụ"
              isLabelHidden
              startIcon="search"
              hasClear
              value={query}
              onChange={setQuery}
              placeholder="Tìm bài để tập sax, sáo…"
              enterKeyHint="search"
              width="100%"
            />
          </div>
          <SegmentedControl label="Lọc theo dạng bài" size="lg" value={filter} onChange={(v) => setFilter(v as SongKind | "all")}>
            {FILTERS.map((f) => (
              <SegmentedControlItem key={f.value} value={f.value} label={f.label} />
            ))}
          </SegmentedControl>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6">
        {songs.isPending ? (
          <ul className="grid gap-4 pt-14 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-48">
                <Skeleton index={i} radius={4} />
              </li>
            ))}
          </ul>
        ) : songs.isError ? (
          <Banner status="error" title="Không tải được thư viện" description={`${songs.error.message}. Tải lại trang để thử lần nữa.`} />
        ) : base.length === 0 ? (
          <Card padding={10}>
            <EmptyState
              icon={<Icon icon={Music2} size="lg" />}
              title={songs.data.length ? "Không có bài nào khớp" : "Thư viện còn trống"}
              description={songs.data.length ? "Thử từ khoá ngắn hơn, hoặc gửi bài bạn đang tìm." : "Gửi bài đầu tiên để mở hàng."}
              actions={<Button href={STUDIO_URL} variant="primary" label="Đóng góp bài" icon={<Icon icon={PenLine} />} />}
            />
          </Card>
        ) : (
          <>
            <InstrumentTabs counts={byTab} total={base.length} selection={selection} onChange={select} />
            {selection.tab === "others" && (others.length > 0 || selection.instrument) ? (
              <OtherInstrumentChips items={others} total={byTab.others.length} value={selection.instrument} onChange={select} />
            ) : (
              <div className="mb-8" />
            )}
            {selection.tab || searching ? (
              <SongSection title={listTitle} songs={list} />
            ) : (
              <div className="space-y-12">
                {LIBRARY_TABS.filter((t) => byTab[t.id].length).map((t) => (
                  <SongSection key={t.id} title={t.label} songs={byTab[t.id]} onMore={() => select({ tab: t.id, instrument: null })} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

const ALL_TAB = "all";

function InstrumentTabs({
  counts,
  total,
  selection,
  onChange,
}: {
  counts: Record<LibraryTab, SongSummary[]>;
  total: number;
  selection: LibrarySelection;
  onChange: (next: LibrarySelection) => void;
}) {
  const tabs: { id: LibraryTab | null; label: string; count: number }[] = [
    { id: null, label: "Tất cả", count: total },
    ...LIBRARY_TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id].length })),
  ];
  return (
    <div className="mb-3">
      <TabList
        size="lg"
        hasDivider
        value={selection.tab ?? ALL_TAB}
        onChange={(v) => onChange({ tab: v === ALL_TAB ? null : (v as LibraryTab), instrument: null })}
      >
        {tabs.map((t) => (
          <Tab key={t.id ?? ALL_TAB} value={t.id ?? ALL_TAB} label={t.label} endContent={<Badge label={t.count} />} />
        ))}
      </TabList>
    </div>
  );
}

/** Second row under "Nhạc cụ khác": narrow down to one instrument (guitar, piano…) or to unclassified songs */
function OtherInstrumentChips({
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
    <div className="-mx-4 mb-8 overflow-x-auto px-4 pt-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ToggleButtonGroup
        label="Lọc trong nhạc cụ khác"
        size="sm"
        value={value ?? ALL_TAB}
        onChange={(v) => {
          if (typeof v !== "string") return; // clicking the pressed chip again keeps the selection
          onChange({ tab: "others", instrument: v === ALL_TAB ? null : (v as InstrumentFilter) });
        }}
      >
        {all.map((c) => {
          const label = c.id ? filterLabel(c.id) : "Tất cả";
          return (
            <ToggleButton key={c.id ?? ALL_TAB} value={c.id ?? ALL_TAB} label={`${label} (${c.count})`}>
              {label} <span className="ml-1 tabular-nums opacity-70">{c.count}</span>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}

/** One instrument section. The overview shows the first 6 songs with a "see all" button. */
function SongSection({ title, songs, onMore }: { title: string; songs: SongSummary[]; onMore?: () => void }) {
  const LIMIT = 6;
  const shown = onMore ? songs.slice(0, LIMIT) : songs;
  return (
    <section>
      <HStack gap={3} vAlign="center" className="mb-4">
        <Heading level={2}>{title}</Heading>
        <Text color="secondary" hasTabularNumbers>
          {songs.length} bài
        </Text>
        {onMore && songs.length > LIMIT && (
          <span className="ml-auto">
            <Button variant="ghost" size="sm" label={`Xem cả ${songs.length} bài`} onClick={onMore} />
          </span>
        )}
      </HStack>
      {shown.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </ul>
      ) : (
        <Card variant="muted" padding={8}>
          <EmptyState isCompact title="Chưa có bài nào khớp" description="Chưa có bài nào cho nhạc cụ này khớp bộ lọc." />
        </Card>
      )}
    </section>
  );
}

/** `preview`: Studio previews an unpublished card — not a link */
export function SongCard({ song: s, preview = false }: { song: SongSummary; preview?: boolean }) {
  const body = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted px-4 pt-4 pb-1 sm:pt-5">
        <SongMotif seed={s.id} />
      </div>
      <VStack gap={1} padding={4} className="flex-1">
        <Heading level={3} maxLines={2} textWrap="balance">
          {s.title}
        </Heading>
        {s.artist && (
          <Text color="secondary" maxLines={1}>
            {s.artist}
          </Text>
        )}
        <HStack gap={1.5} vAlign="center" wrap="wrap" className="mt-auto pt-3">
          {s.instruments.slice(0, 2).map((i) => (
            <Token key={i} size="sm" label={instrumentLabel(i)} />
          ))}
          {s.instruments.length > 2 && (
            <Token size="sm" label={`+${s.instruments.length - 2}`} description={s.instruments.slice(2).map(instrumentLabel).join(", ")} />
          )}
          <span className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", "ml-auto")}>
            {s.key && (
              <Token size="sm" color="gray" label={formatKeyName(s.key)} description={`Tone ${s.key}`} />
            )}
            <span className="flex items-center gap-1" title={s.kind === "text" ? "Bài dạng chữ" : "Bài dạng ảnh"}>
              <Icon icon={s.kind === "text" ? Type : FileImage} size="sm" />
              {s.kind === "text" ? "Chữ" : `${s.pageCount} ảnh`}
            </span>
          </span>
        </HStack>
      </VStack>
    </div>
  );
  return (
    <li className="h-full">
      {preview ? (
        <Card padding={0} height="100%">
          {body}
        </Card>
      ) : (
        <ClickableCard href={`/s/${s.id}`} label={s.artist ? `${s.title} — ${s.artist}` : s.title} padding={0} height="100%">
          {body}
        </ClickableCard>
      )}
    </li>
  );
}
