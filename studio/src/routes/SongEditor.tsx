import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Eye, Lock, Save, Send, Trash2, Undo2, X } from "lucide-react";
import type { PageImage, Song, SongInput, SongKind, ViewMode } from "@shared/types";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { useToast } from "@astryxdesign/core/Toast";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { ImageUploader } from "@studio/components/ImageUploader";
import { StatusBadge } from "@studio/components/StatusBadge";
import { TextNotation } from "@/components/stage/TextNotation";
import { Stage } from "@/components/stage/Stage";
import { SongCard } from "@/routes/Library";
import { canDelete, canEdit, canSubmit, type SongRef } from "@shared/permissions";
import { INSTRUMENTS_FOCUS_FIRST, instrumentLabel, isFocusInstrument, parseInstruments, type InstrumentId } from "@shared/instruments";
import { useMe } from "@studio/hooks/useMe";
import { api } from "@studio/lib/api";
import { formatDuration, parseDuration } from "@/lib/stage/math";
import { parseNotation } from "@/lib/notation/parse";
import { guessKeyName, KEY_ROOTS, keyRootPc } from "@/lib/notation/transpose";
import { cn } from "@/lib/utils";

const EXAMPLES = {
  "Cảm âm": `Đường về chiều mưa rơi, Thấy anh cùng ai bước chung
Sol La Si Re2 Re2. Si La Sol-Re La Re2 Si`,
  "Hợp âm": `Am            C              G
Đường về chiều mưa rơi, thấy anh cùng ai

[F]Bỗng nhiên bao nhiêu [G]ký ức quen [Am]thuộc`,
  Tab: `Intro
e|-----0---------0-----|
B|---1---1-----1---1---|
G|-2-------2-2-------2-|`,
};
const SAMPLE = EXAMPLES["Cảm âm"];

interface Form {
  title: string;
  artist: string;
  instruments: InstrumentId[];
  kind: SongKind;
  textContent: string;
  note: string;
  mode: ViewMode;
  duration: string;
  fontScale: number;
  /** nhịp độ cho máy đếm nhịp; trống = mặc định */
  bpm: string;
  /** original key root from KEY_ROOTS; "" = unknown */
  keyRoot: string;
  keyMinor: boolean;
}

const emptyForm: Form = {
  title: "",
  artist: "",
  instruments: [],
  kind: "text",
  textContent: "",
  note: "",
  mode: "scroll",
  duration: "",
  fontScale: 1,
  bpm: "",
  keyRoot: "",
  keyMinor: false,
};

/** split a stored key ("Am", "A#") into the picker's canonical root + minor flag */
function keyParts(key: string | undefined): Pick<Form, "keyRoot" | "keyMinor"> {
  const pc = keyRootPc(key);
  if (pc === null) return { keyRoot: "", keyMinor: false };
  return { keyRoot: KEY_ROOTS[pc], keyMinor: key!.endsWith("m") };
}

const FOCUS_CHOICES = INSTRUMENTS_FOCUS_FIRST.filter((i) => isFocusInstrument(i.id));
const OTHER_CHOICES = INSTRUMENTS_FOCUS_FIRST.filter((i) => !isFocusInstrument(i.id));

/** Saxophone and Sáo up front; the other instruments sit in a collapsible group (opened when one of them is picked) */
function InstrumentPicker({
  value,
  onToggle,
  isDisabled,
}: {
  value: InstrumentId[];
  onToggle: (id: InstrumentId) => void;
  isDisabled: boolean;
}) {
  const pickedOthers = value.filter((id) => !isFocusInstrument(id));
  const hasOthers = pickedOthers.length > 0;
  const [open, setOpen] = useState(hasOthers);
  // songs load after the first render: open the group once an existing song turns out to use another instrument
  useEffect(() => {
    if (hasOthers) setOpen(true);
  }, [hasOthers]);

  const chip = (i: (typeof INSTRUMENTS_FOCUS_FIRST)[number], big = false) => {
    const on = value.includes(i.id);
    return (
      <ToggleButton
        key={i.id}
        size={big ? "md" : "sm"}
        label={i.label}
        isPressed={on}
        isDisabled={isDisabled}
        onPressedChange={() => onToggle(i.id)}
        icon={on ? <Icon icon={Check} size="sm" /> : undefined}
      >
        {i.label}
      </ToggleButton>
    );
  };

  return (
    <VStack gap={2} role="group" aria-labelledby="instrument-label">
      <HStack gap={1.5} vAlign="center" wrap="wrap">
        {FOCUS_CHOICES.map((i) => chip(i, true))}
        <Button
          variant="ghost"
          label="Nhạc cụ khác"
          aria-expanded={open}
          aria-controls="instrument-others"
          onClick={() => setOpen((o) => !o)}
          endContent={<Icon icon={ChevronDown} size="sm" className={cn("transition-transform", open && "rotate-180")} />}
        >
          {`Nhạc cụ khác${hasOthers && !open ? ` (${pickedOthers.length})` : ""}`}
        </Button>
      </HStack>
      {open && (
        <Card variant="muted" padding={2}>
          <HStack gap={1.5} wrap="wrap" id="instrument-others">
            {OTHER_CHOICES.map((i) => chip(i))}
          </HStack>
        </Card>
      )}
    </VStack>
  );
}

const KEY_ROOT_OPTIONS = [{ value: "", label: "Không rõ" }, ...KEY_ROOTS.map((r) => ({ value: r, label: r }))];

/** form field label + optional hint, for custom controls that have no built-in label */
function FieldLabel({ children, hint, id }: { children: ReactNode; hint?: string; id?: string }) {
  return (
    <VStack gap={0.5}>
      <Text type="label" weight="semibold" id={id} display="block">
        {children}
      </Text>
      {hint && (
        <Text type="supporting" color="secondary" display="block">
          {hint}
        </Text>
      )}
    </VStack>
  );
}

type EditorTab = "info" | "content" | "review" | "preview";

function fromSong(s: Song): Form {
  return {
    title: s.title,
    artist: s.artist,
    instruments: parseInstruments(s.instruments.join(",")),
    kind: s.kind,
    textContent: s.textContent,
    note: s.note ?? "",
    mode: s.settings.mode ?? "scroll",
    duration: s.settings.durationSec ? formatDuration(s.settings.durationSec) : "",
    fontScale: s.settings.fontScale ?? 1,
    bpm: s.settings.bpm ? String(s.settings.bpm) : "",
    ...keyParts(s.settings.key),
  };
}

export function SongEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdmin } = useMe();
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "unpublish" | null>(null);
  const showToast = useToast();
  const toast = {
    success: (body: string) => showToast({ body }),
    error: (body: string) => void showToast({ body, type: "error" }),
  };

  const song = useQuery({
    queryKey: ["song", id],
    queryFn: () => api.getSong(id!),
    enabled: !!id,
  });
  useEffect(() => {
    if (song.data) {
      setForm(fromSong(song.data));
      setPages(song.data.pages);
    }
  }, [song.data]);

  const actor = user!;
  const ref: SongRef | null = song.data
    ? {
        ownerId: song.data.owner?.id ?? null,
        status: song.data.status ?? "draft",
      }
    : null;
  const editable = isNew || (!!ref && canEdit(actor, ref));
  const deletable = !!ref && canDelete(actor, ref);
  const submittable = !!ref && canSubmit(actor, ref);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleInstrument = (i: InstrumentId) =>
    set("instruments", form.instruments.includes(i) ? form.instruments.filter((x) => x !== i) : [...form.instruments, i]);

  const durationSec = form.duration.trim() ? parseDuration(form.duration) : undefined;
  const durationInvalid = durationSec === null || (durationSec !== undefined && (durationSec < 5 || durationSec > 3600));
  const bpm = form.bpm.trim() ? Number(form.bpm) : undefined;
  const bpmInvalid = bpm !== undefined && !(Number.isInteger(bpm) && bpm >= 20 && bpm <= 400);
  const settingsInvalid = durationInvalid || bpmInvalid;
  const songKey = form.keyRoot ? form.keyRoot + (form.keyMinor ? "m" : "") : undefined;
  const guessedKey = useMemo(
    () => (form.kind === "text" && !form.keyRoot ? guessKeyName(parseNotation(form.textContent)) : null),
    [form.kind, form.keyRoot, form.textContent],
  );

  const toInput = (): SongInput => ({
    title: form.title.trim(),
    artist: form.artist.trim(),
    instruments: form.instruments,
    kind: form.kind,
    textContent: form.textContent,
    note: form.note.trim(),
    settings: {
      ...(song.data?.settings ?? {}),
      mode: form.mode,
      fontScale: form.fontScale,
      durationSec: durationSec ?? undefined,
      bpm: bpmInvalid ? undefined : bpm,
      key: songKey,
    },
  });

  /** bài tạm dựng từ form (kể cả chưa lưu) để xem trước đúng như trang công khai */
  const draftSong = useMemo<Song>(() => {
    const input = toInput();
    return {
      id: id ?? "preview",
      title: input.title || "Bài chưa đặt tên",
      artist: input.artist ?? "",
      instruments: form.instruments,
      kind: form.kind,
      textContent: form.kind === "text" ? form.textContent : "",
      note: input.note ?? "",
      settings: input.settings ?? {},
      pages: form.kind === "sheet" ? pages : [],
      createdAt: song.data?.createdAt ?? Date.now(),
      updatedAt: song.data?.updatedAt ?? Date.now(),
    };
  }, [id, form, pages, song.data, durationSec, bpm, bpmInvalid, songKey]); // toInput() chỉ phụ thuộc form + song.data

  const openPreview = () => {
    if (form.kind === "sheet" && !pages.length)
      return toast.error(
        isNew ? "Bài dạng ảnh: bấm “Tiếp tục: tải ảnh lên” rồi tải ảnh trước khi xem trước" : "Tải ít nhất một ảnh lên trước khi xem trước",
      );
    if (form.kind === "text" && !form.textContent.trim()) return toast.error("Nhập nội dung bài trước khi xem trước");
    setPreviewing(true);
  };

  // khoá cuộn trang phía sau khi đang xem trước
  useEffect(() => {
    if (!previewing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewing]);

  /** gửi duyệt xong: tab mới mở trang xem bài, tab này về danh sách bài của tôi */
  const showSubmitted = (tab: Window | null, songId: string) => {
    const url = `/songs/${songId}/preview`;
    if (tab) {
      tab.opener = null;
      tab.location.replace(url);
      navigate("/", { replace: true });
    } else {
      // trình duyệt chặn tab mới → xem bài ngay tại tab này
      navigate(url, { replace: true });
    }
  };

  const save = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!form.title.trim() || settingsInvalid) return;
    // bài dạng chữ mới: tạo + gửi duyệt luôn, không qua bước nháp
    const direct = isNew && form.kind === "text";
    if (direct && !form.textContent.trim()) return;
    setSaving(true);
    // mở sẵn tab trống ngay trong lúc bấm (mở sau khi chờ API sẽ bị trình duyệt chặn popup)
    const tab = direct ? window.open("", "_blank") : null;
    let createdId: string | null = null;
    try {
      const saved = isNew ? await api.createSong(toInput()) : await api.updateSong(id!, toInput());
      createdId = isNew ? saved.id : null;
      qc.setQueryData(["song", saved.id], saved);
      qc.invalidateQueries({ queryKey: ["songs"] });
      if (direct) {
        const sent = await api.submitSong(saved.id);
        qc.setQueryData(["song", saved.id], sent);
        toast.success("Đã gửi duyệt — bài sẽ lên thư viện khi quản trị viên duyệt");
        showSubmitted(tab, saved.id);
      } else if (isNew) {
        // bài dạng ảnh: cần có bài trước mới tải ảnh lên được
        toast.success("Đã tạo bài — tải ảnh lên rồi bấm Gửi duyệt");
        navigate(`/songs/${saved.id}`, { replace: true });
      } else {
        toast.success("Đã lưu");
      }
    } catch (err) {
      tab?.close();
      toast.error((err as Error).message);
      // đã tạo được bài nhưng gửi duyệt lỗi → mở bài đó để gửi lại, tránh tạo trùng
      if (createdId) navigate(`/songs/${createdId}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setConfirm(null);
    if (!id) return;
    try {
      await api.deleteSong(id);
      qc.invalidateQueries({ queryKey: ["songs"] });
      qc.removeQueries({ queryKey: ["song", id] });
      toast.success("Đã xoá bài");
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onPagesChange = (next: PageImage[]) => {
    setPages(next);
    if (id) {
      qc.setQueryData<Song>(["song", id], (s) => (s ? { ...s, pages: next } : s));
      qc.invalidateQueries({ queryKey: ["songs"] });
    }
  };

  /** lưu (nếu được sửa) rồi gửi duyệt */
  const submit = async () => {
    if (!id) return;
    setBusy(true);
    const tab = window.open("", "_blank");
    try {
      if (editable) await api.updateSong(id, toInput());
      const s = await api.submitSong(id);
      qc.setQueryData(["song", id], s);
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Đã gửi duyệt — bài sẽ lên thư viện khi quản trị viên duyệt");
      showSubmitted(tab, id);
    } catch (err) {
      tab?.close();
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const review = async (decision: "approve" | "reject" | "unpublish") => {
    if (!id) return;
    if (decision === "reject" && !reviewNote.trim()) return toast.error("Ghi lý do từ chối để người đăng biết cần sửa gì");
    setConfirm(null);
    setBusy(true);
    try {
      const s = await api.reviewSong(id, decision, reviewNote.trim() || undefined);
      qc.setQueryData(["song", id], s);
      qc.invalidateQueries({ queryKey: ["songs"] });
      setReviewNote("");
      toast.success(
        decision === "approve" ? "Đã duyệt — bài đã lên thư viện" : decision === "reject" ? "Đã từ chối" : "Đã gỡ khỏi thư viện",
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // --- workspace layout (Astryx template "editor"): tabs in the side panel, live canvas beside it ---
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [tab, setTab] = useState<EditorTab>("info");
  // open on the review tab when there is something to act on there (once, when the song loads)
  const songStatus = song.data?.status;
  const songLoadedId = song.data?.id;
  useEffect(() => {
    if (!songLoadedId) return;
    if (songStatus === "rejected" || (isAdmin && songStatus === "pending")) setTab("review");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another song loads
  }, [songLoadedId]);
  // the preview tab exists on phones only (desktop shows the canvas beside the panel)
  useEffect(() => {
    if (!isMobile && tab === "preview") setTab("info");
  }, [isMobile, tab]);

  if (id && song.isPending)
    return (
      <Center axis="both" padding={10}>
        <Spinner size="xl" label="Đang tải…" />
      </Center>
    );
  if (id && song.isError)
    return (
      <VStack padding={4}>
        <Banner status="error" title="Không tải được bài" description={song.error.message} />
      </VStack>
    );

  const directSubmit = isNew && form.kind === "text";
  const saveDisabled = !form.title.trim() || settingsInvalid || (directSubmit && !form.textContent.trim());
  const saveLabel = saving
    ? directSubmit
      ? "Đang gửi…"
      : "Đang lưu…"
    : isNew
      ? form.kind === "sheet"
        ? "Tiếp tục: tải ảnh lên"
        : "Gửi duyệt"
      : "Lưu";

  // --- header toolbar: back, title, status / preview, delete, save + submit ---
  const header = (
    <LayoutHeader hasDivider padding={2}>
      <Toolbar
        label="Thao tác với bài"
        startContent={
          <HStack gap={2} vAlign="center">
            <IconButton href="/" variant="ghost" label="Quay lại" tooltip="Quay lại" icon={<Icon icon={ArrowLeft} />} />
            <Heading level={1} maxLines={1}>
              {isNew ? "Bài mới" : form.title || "Bài chưa đặt tên"}
            </Heading>
            {song.data?.status && <StatusBadge status={song.data.status} />}
            {!editable && <Icon icon={Lock} size="sm" color="secondary" label="Đã khoá" />}
          </HStack>
        }
        endContent={
          <HStack gap={1} vAlign="center">
            {deletable && (
              <IconButton
                variant="ghost"
                label="Xoá bài"
                tooltip="Xoá bài"
                icon={<Icon icon={Trash2} color="error" />}
                onClick={() => setConfirm("delete")}
              />
            )}
            {isMobile ? (
              <IconButton label="Xem trước" tooltip="Xem trước toàn màn hình" icon={<Icon icon={Eye} />} onClick={openPreview} />
            ) : (
              <Button
                label="Xem trước"
                tooltip="Xem bài trông thế nào trên trang công khai (kể cả thay đổi chưa lưu)"
                icon={<Icon icon={Eye} />}
                onClick={openPreview}
              />
            )}
            {editable && (
              <Button
                variant={submittable ? "secondary" : "primary"}
                label={saveLabel}
                icon={<Icon icon={directSubmit ? Send : Save} />}
                isLoading={saving}
                isDisabled={saveDisabled}
                onClick={save}
              />
            )}
            {submittable && (
              <Button
                variant="primary"
                label="Gửi duyệt"
                icon={<Icon icon={Send} />}
                isLoading={busy}
                isDisabled={!form.title.trim() || settingsInvalid}
                onClick={submit}
              />
            )}
          </HStack>
        }
      />
    </LayoutHeader>
  );

  // --- tab: song info and default reader settings ---
  const infoTab = (
    <VStack gap={5}>
      <TextInput label="Tên bài" isRequired value={form.title} onChange={(v) => set("title", v)} width="100%" isDisabled={!editable} />
      <TextInput label="Ca sĩ / tác giả" value={form.artist} onChange={(v) => set("artist", v)} width="100%" isDisabled={!editable} />
      <VStack gap={2}>
        <FieldLabel id="instrument-label" hint="Chọn được nhiều nhạc cụ. Bài sẽ hiện trong từng mục tương ứng ở thư viện.">
          Nhạc cụ
        </FieldLabel>
        <InstrumentPicker value={form.instruments} onToggle={toggleInstrument} isDisabled={!editable} />
      </VStack>
      <TextArea
        label="Ghi chú cho người chơi"
        description="Hiện trên đầu bài cho mọi người xem — vd tone, capo, nhịp, đoạn cần chú ý."
        value={form.note}
        onChange={(v) => set("note", v)}
        maxLength={2000}
        rows={3}
        placeholder="Tone Am · capo 2 · điệp khúc đánh mạnh hơn…"
        width="100%"
        isDisabled={!editable}
      />
      <VStack gap={2}>
        <FieldLabel hint="Dạng chữ: cảm âm, hợp âm, tab. Ảnh: sheet hoặc bản chụp.">Loại nội dung</FieldLabel>
        <Segmented
          label="Loại nội dung"
          value={form.kind}
          onChange={(v) => set("kind", v)}
          isDisabled={!editable}
          options={[
            { value: "text", label: "Dạng chữ" },
            { value: "sheet", label: "Ảnh / sheet" },
          ]}
        />
      </VStack>
      <Divider />
      <Heading level={3}>Mặc định khi mở bài</Heading>
      <VStack gap={2}>
        <FieldLabel>Chế độ xem</FieldLabel>
        <Segmented
          label="Chế độ xem"
          value={form.mode}
          onChange={(v) => set("mode", v)}
          isDisabled={!editable}
          options={[
            { value: "scroll", label: "Cuộn" },
            { value: "pages", label: "Sách" },
          ]}
        />
      </VStack>
      <Grid columns={2} gap={3}>
        <TextInput
          label="Thời lượng"
          description="phút:giây"
          value={form.duration}
          onChange={(v) => set("duration", v)}
          placeholder="vd 3:40"
          status={
            durationInvalid
              ? {
                  type: "error",
                  message: "Nhập dạng phút:giây, từ 0:05 đến 60:00.",
                }
              : undefined
          }
          width="100%"
          isDisabled={!editable}
        />
        <TextInput
          label="Nhịp độ (BPM)"
          description="Cho máy đếm nhịp"
          inputMode="numeric"
          value={form.bpm}
          onChange={(v) => set("bpm", v)}
          placeholder="vd 96"
          status={bpmInvalid ? { type: "error", message: "Nhập số nguyên từ 20 đến 400." } : undefined}
          width="100%"
          isDisabled={!editable}
        />
        <Selector
          label="Tone gốc"
          options={KEY_ROOT_OPTIONS}
          value={form.keyRoot}
          onChange={(v) => set("keyRoot", v ?? "")}
          isDisabled={!editable}
          width="100%"
        />
        <Selector
          label="Trưởng / thứ"
          options={[
            { value: "major", label: "Trưởng" },
            { value: "minor", label: "Thứ" },
          ]}
          value={form.keyMinor ? "minor" : "major"}
          onChange={(v) => set("keyMinor", v === "minor")}
          isDisabled={!editable || !form.keyRoot}
          width="100%"
        />
      </Grid>
      {guessedKey && editable && (
        <Button size="sm" label={`Đoán từ hợp âm: ${guessedKey}`} onClick={() => setForm((f) => ({ ...f, ...keyParts(guessedKey) }))} />
      )}
      <Slider
        label="Cỡ chữ / phóng to"
        min={0.6}
        max={2.5}
        step={0.05}
        value={form.fontScale}
        onChange={(v: number) => set("fontScale", v)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        valueDisplay="text"
        width="100%"
        isDisabled={!editable}
      />
    </VStack>
  );

  // --- tab: the notation text, or the page images for a sheet ---
  const pickExample = (k: keyof typeof EXAMPLES) => {
    const current = form.textContent.trim();
    const isExample = Object.values(EXAMPLES).includes(form.textContent);
    if (current && !isExample && !window.confirm(`Thay nội dung đang nhập bằng mẫu “${k}”?`)) return;
    set("textContent", EXAMPLES[k]);
  };
  const contentTab =
    form.kind === "text" ? (
      <VStack gap={3}>
        <FieldLabel>Nội dung (cảm âm, hợp âm, tab…)</FieldLabel>
        {editable && (
          <HStack gap={1} vAlign="center" wrap="wrap">
            <Text type="supporting" color="secondary">
              Mẫu:
            </Text>
            {(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[]).map((k) => (
              <ToggleButton
                key={k}
                size="sm"
                label={k}
                tooltip={`Điền mẫu ${k} vào ô nội dung`}
                isPressed={form.textContent === EXAMPLES[k]}
                onPressedChange={() => pickExample(k)}
              >
                {k}
              </ToggleButton>
            ))}
          </HStack>
        )}
        <TextArea
          label="Nội dung"
          isLabelHidden
          value={form.textContent}
          onChange={(v) => set("textContent", v)}
          rows={isMobile ? 14 : 20}
          hasSpellCheck={false}
          controlClassName="font-mono text-sm leading-relaxed"
          placeholder={"Dán bản nhạc dạng chữ, ví dụ cảm âm:\n" + SAMPLE + "\n\n(dòng trống = sang đoạn mới)"}
          width="100%"
          isDisabled={!editable}
        />
        <Text type="supporting" color="secondary">
          <Text type="supporting" weight="semibold">
            Cảm âm:
          </Text>{" "}
          dòng lời rồi dòng nốt Do Re Mi… (thêm số cho quãng tám: Re2, D2).{" "}
          <Text type="supporting" weight="semibold">
            Hợp âm:
          </Text>{" "}
          dòng hợp âm (Am C G7) đặt trên dòng lời, hoặc chèn ngay trong lời như [Am]Đường về.{" "}
          <Text type="supporting" weight="semibold">
            Tab:
          </Text>{" "}
          các dòng e|--0--|. Dòng trống để ngắt đoạn — lật trang sẽ ưu tiên ngắt ở đây.
        </Text>
      </VStack>
    ) : id ? (
      <VStack gap={3}>
        <FieldLabel>{`Ảnh theo thứ tự${editable ? " (kéo để sắp xếp)" : ""}`}</FieldLabel>
        {editable ? (
          <ImageUploader songId={id} pages={pages} onChange={onPagesChange} />
        ) : pages.length ? (
          <Grid columns={3} gap={2}>
            {pages.map((p) => (
              <img key={p.id} src={p.url} alt="" className="rounded border border-border bg-white" />
            ))}
          </Grid>
        ) : (
          <EmptyState isCompact title="Bài chưa có ảnh" />
        )}
      </VStack>
    ) : (
      <Card variant="muted" padding={6}>
        <EmptyState
          isCompact
          title="Chưa tải ảnh được"
          description="Tạo bài trước (nút “Tiếp tục: tải ảnh lên” ở trên), sau đó tải ảnh lên tại đây."
        />
      </Card>
    );

  // --- tab: review status, feedback and the admin decision ---
  const statusText =
    song.data?.status === "draft"
      ? "Bài chưa gửi duyệt — chỉ bạn và quản trị viên thấy. Xong thì bấm Gửi duyệt."
      : song.data?.status === "pending"
        ? "Đang chờ quản trị viên duyệt. Bạn vẫn có thể sửa trong lúc chờ."
        : song.data?.status === "approved"
          ? isAdmin
            ? "Bài đang hiện trên thư viện công khai."
            : "Bài đã được duyệt và đang hiện trên thư viện. Muốn sửa, hãy liên hệ quản trị viên."
          : song.data?.status === "rejected"
            ? "Bài bị từ chối. Sửa theo góp ý rồi Gửi duyệt lại."
            : "";
  const reviewTab = song.data && (
    <VStack gap={4}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Text weight="semibold">Trạng thái</Text>
          {song.data.status && <StatusBadge status={song.data.status} />}
        </HStack>
        <Text color="secondary">{statusText}</Text>
        {song.data.owner && isAdmin && (
          <Text type="supporting" color="secondary">
            {`Người đăng: ${song.data.owner.name || song.data.owner.email} (${song.data.owner.email})`}
          </Text>
        )}
      </VStack>
      {song.data.reviewNote && song.data.status !== "approved" && (
        <Banner status="error" title="Góp ý của quản trị viên" description={song.data.reviewNote} />
      )}
      {isAdmin && (
        <>
          <Divider />
          <Heading level={3}>Duyệt bài</Heading>
          {song.data.status !== "approved" ? (
            <>
              <TextArea
                label="Lý do / góp ý"
                description="Bắt buộc khi từ chối, để người đăng biết cần sửa gì."
                value={reviewNote}
                onChange={setReviewNote}
                rows={3}
                maxLength={1000}
                width="100%"
              />
              <HStack gap={2} wrap="wrap">
                <Button
                  variant="primary"
                  label="Duyệt & đăng lên thư viện"
                  icon={<Icon icon={Check} />}
                  isDisabled={busy}
                  onClick={() => review("approve")}
                />
                <Button variant="destructive" label="Từ chối" icon={<Icon icon={X} />} isDisabled={busy} onClick={() => review("reject")} />
              </HStack>
            </>
          ) : (
            <HStack>
              <Button label="Gỡ khỏi thư viện" icon={<Icon icon={Undo2} />} isDisabled={busy} onClick={() => setConfirm("unpublish")} />
            </HStack>
          )}
        </>
      )}
    </VStack>
  );

  // --- live canvas: the library card plus the rendered song ---
  const canvas = (
    <VStack gap={6} maxWidth={720} width="100%" className="mx-auto">
      <VStack gap={2}>
        <FieldLabel>Thẻ bài trên thư viện</FieldLabel>
        <VStack maxWidth={320} width="100%">
          <SongCard preview song={{ ...draftSong, pageCount: pages.length, key: songKey }} />
        </VStack>
        <Text type="supporting" color="secondary">
          {"Hiện trong mục: "}
          <Text type="supporting" weight="semibold" color="primary">
            {form.instruments.length ? form.instruments.map(instrumentLabel).join(", ") : "Chưa phân loại"}
          </Text>
          {form.instruments.length ? "" : " — chọn nhạc cụ để bài nằm đúng mục"}
        </Text>
      </VStack>
      <VStack gap={2}>
        <FieldLabel>{form.kind === "sheet" ? `Ảnh (${pages.length})` : "Bản nhạc"}</FieldLabel>
        {form.kind === "sheet" ? (
          pages.length ? (
            <VStack gap={3}>
              {pages.map((p, i) => (
                <img key={p.id} src={p.url} alt={`Trang ${i + 1}`} className="w-full rounded-lg border border-border bg-white" />
              ))}
            </VStack>
          ) : (
            <Card variant="muted" padding={6}>
              <EmptyState isCompact title="Chưa có ảnh" description="Tải ảnh lên ở tab Nội dung." />
            </Card>
          )
        ) : (
          // the stage keeps its own dark surface; font size follows the slider live
          <div className="dark rounded-xl border border-border bg-stage-bg py-6 text-stage-fg" style={{ fontSize: `${form.fontScale}rem` }}>
            {form.textContent.trim() ? (
              <TextNotation text={form.textContent} />
            ) : (
              <p className="px-6 text-sm text-stage-lyric">Nhập nội dung ở tab Nội dung để xem trước…</p>
            )}
          </div>
        )}
      </VStack>
    </VStack>
  );

  const activeTab = isNew && tab === "review" ? "info" : tab;
  const tabBody = activeTab === "info" ? infoTab : activeTab === "content" ? contentTab : activeTab === "review" ? reviewTab : canvas;

  const tabs = (
    <VStack gap={0}>
      <TabList layout="fill" value={activeTab} onChange={(v) => setTab(v as EditorTab)} hasDivider>
        <Tab value="info" label="Thông tin" />
        <Tab value="content" label="Nội dung" />
        {!isNew && <Tab value="review" label="Duyệt" />}
        {isMobile && <Tab value="preview" label="Xem" />}
      </TabList>
    </VStack>
  );

  // Enter in a field saves, like the old single form did
  const panelBody = (
    <form onSubmit={save} noValidate>
      <Section variant="transparent" padding={4}>
        {tabBody}
      </Section>
    </form>
  );

  return (
    <>
      <title>{isNew ? "Bài mới · Gang Muzik Studio" : `${form.title} · Gang Muzik Studio`}</title>
      <Layout
        height="fill"
        header={header}
        start={
          isMobile ? undefined : (
            <LayoutPanel hasDivider padding={0} width={400} label="Soạn bài">
              {tabs}
              {panelBody}
            </LayoutPanel>
          )
        }
        content={
          isMobile ? (
            <LayoutContent role="main" padding={0}>
              {tabs}
              {panelBody}
            </LayoutContent>
          ) : (
            <LayoutContent role="main" padding={8} label="Xem trực tiếp">
              {canvas}
            </LayoutContent>
          )
        }
      />
      <AlertDialog
        isOpen={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Xoá bài này?"
        description={`Xoá bài “${form.title}” và toàn bộ ảnh. Không thể hoàn tác.`}
        actionLabel="Xoá bài"
        cancelLabel="Huỷ"
        onAction={remove}
      />
      <AlertDialog
        isOpen={confirm === "unpublish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Gỡ khỏi thư viện?"
        description="Bài sẽ không còn hiện trên thư viện công khai và chuyển về Nháp."
        actionLabel="Gỡ bài"
        cancelLabel="Huỷ"
        isActionLoading={busy}
        onAction={() => review("unpublish")}
      />
      {previewing &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Xem trước bài">
            <title>{`Xem trước: ${draftSong.title}`}</title>
            {/* persist=false: ignore settings saved on this device, always follow the form; no "save defaults" button */}
            <Stage song={draftSong} persist={false} onBack={() => setPreviewing(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  isDisabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  isDisabled?: boolean;
}) {
  return (
    <SegmentedControl label={label} layout="fill" value={value} onChange={(v) => onChange(v as T)} isDisabled={isDisabled}>
      {options.map((o) => (
        <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
      ))}
    </SegmentedControl>
  );
}
