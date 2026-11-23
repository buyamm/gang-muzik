import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Eye, Lock, Send, Trash2, Undo2, X } from "lucide-react";
import type { PageImage, Song, SongInput, SongKind, ViewMode } from "@shared/types";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { useToast } from "@astryxdesign/core/Toast";
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
function InstrumentPicker({ value, onToggle }: { value: InstrumentId[]; onToggle: (id: InstrumentId) => void }) {
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
        onPressedChange={() => onToggle(i.id)}
        icon={on ? <Icon icon={Check} size="sm" /> : undefined}
      >
        {i.label}
      </ToggleButton>
    );
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby="instrument-label">
      <div className="flex flex-wrap items-center gap-1.5">
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
      </div>
      {open && (
        <div id="instrument-others" className="flex flex-wrap gap-1.5 rounded-xl border border-dashed border-border p-2">
          {OTHER_CHOICES.map((i) => chip(i))}
        </div>
      )}
    </div>
  );
}

const KEY_ROOT_OPTIONS = [{ value: "", label: "Không rõ" }, ...KEY_ROOTS.map((r) => ({ value: r, label: r }))];

/** form field label + optional hint, for custom controls that have no built-in label */
function FieldLabel({ children, hint, id }: { children: React.ReactNode; hint?: string; id?: string }) {
  return (
    <div className="space-y-0.5">
      <Text type="label" weight="semibold" id={id} display="block">
        {children}
      </Text>
      {hint && (
        <Text type="supporting" color="secondary" display="block">
          {hint}
        </Text>
      )}
    </div>
  );
}

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

  const song = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id!), enabled: !!id });
  useEffect(() => {
    if (song.data) {
      setForm(fromSong(song.data));
      setPages(song.data.pages);
    }
  }, [song.data]);

  const actor = user!;
  const ref: SongRef | null = song.data ? { ownerId: song.data.owner?.id ?? null, status: song.data.status ?? "draft" } : null;
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
      return toast.error(isNew ? "Bài dạng ảnh: bấm “Tiếp tục: tải ảnh lên” rồi tải ảnh trước khi xem trước" : "Tải ít nhất một ảnh lên trước khi xem trước");
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success(decision === "approve" ? "Đã duyệt — bài đã lên thư viện" : decision === "reject" ? "Đã từ chối" : "Đã gỡ khỏi thư viện");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (id && song.isPending) return <div className="p-10 text-center text-muted-foreground">Đang tải…</div>;
  if (id && song.isError) return <Banner status="error" title="Không tải được bài" description={song.error.message} />;

  return (
    <div>
      <title>{isNew ? "Bài mới · Gang Muzik Studio" : `${form.title} · Gang Muzik Studio`}</title>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <IconButton href="/" variant="ghost" label="Quay lại" tooltip="Quay lại" icon={<Icon icon={ArrowLeft} />} />
        <Heading level={1}>{isNew ? "Bài mới" : editable ? "Sửa bài" : "Xem bài"}</Heading>
        {song.data?.status && <StatusBadge status={song.data.status} />}
        <div className="flex-1" />
        <Button
          label="Xem trước"
          tooltip="Xem bài trông thế nào trên trang công khai (kể cả thay đổi chưa lưu)"
          icon={<Icon icon={Eye} />}
          onClick={openPreview}
        />
        {deletable && (
          <IconButton variant="ghost" label="Xoá bài" tooltip="Xoá bài" icon={<Icon icon={Trash2} color="error" />} onClick={() => setConfirm("delete")} />
        )}
      </div>

      {/* trạng thái duyệt */}
      {song.data && (
        <Card padding={4}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1">
              {song.data.status === "draft" && "Bài chưa gửi duyệt — chỉ bạn và quản trị viên thấy. Xong thì bấm Gửi duyệt."}
              {song.data.status === "pending" && "Đang chờ quản trị viên duyệt. Bạn vẫn có thể sửa trong lúc chờ."}
              {song.data.status === "approved" && (isAdmin ? "Bài đang hiện trên thư viện công khai." : "Bài đã được duyệt và đang hiện trên thư viện. Muốn sửa, hãy liên hệ quản trị viên.")}
              {song.data.status === "rejected" && "Bài bị từ chối. Sửa theo góp ý rồi Gửi duyệt lại."}
              {song.data.owner && isAdmin && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Người đăng: {song.data.owner.name || song.data.owner.email} ({song.data.owner.email})
                </span>
              )}
            </span>
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
            {!editable && <Icon icon={Lock} size="sm" color="secondary" label="Đã khoá" />}
          </div>
          {song.data.reviewNote && song.data.status !== "approved" && (
            <Banner status="error" title="Góp ý của quản trị viên" description={song.data.reviewNote} />
          )}
          {isAdmin && (
            <div className="space-y-3 border-t border-border pt-3">
              <FieldLabel>Duyệt bài (quản trị viên)</FieldLabel>
              {song.data.status !== "approved" && (
                <TextArea
                  label="Lý do / góp ý"
                  isLabelHidden
                  value={reviewNote}
                  onChange={setReviewNote}
                  rows={2}
                  maxLength={1000}
                  placeholder="Lý do / góp ý (bắt buộc khi từ chối)"
                  width="100%"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {song.data.status !== "approved" && (
                  <>
                    <Button
                      variant="primary"
                      label="Duyệt & đăng lên thư viện"
                      icon={<Icon icon={Check} />}
                      isDisabled={busy}
                      onClick={() => review("approve")}
                    />
                    <Button variant="destructive" label="Từ chối" icon={<Icon icon={X} />} isDisabled={busy} onClick={() => review("reject")} />
                  </>
                )}
                {song.data.status === "approved" && (
                  <Button label="Gỡ khỏi thư viện" icon={<Icon icon={Undo2} />} isDisabled={busy} onClick={() => setConfirm("unpublish")} />
                )}
              </div>
            </div>
          )}
        </div>
        </Card>
      )}

      <form onSubmit={save} className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset disabled={!editable} className="min-w-0 space-y-5 disabled:opacity-70">
          <TextInput label="Tên bài" isRequired value={form.title} onChange={(v) => set("title", v)} width="100%" isDisabled={!editable} />
          <TextInput label="Ca sĩ / tác giả" value={form.artist} onChange={(v) => set("artist", v)} width="100%" isDisabled={!editable} />
          <div className="space-y-2">
            <FieldLabel id="instrument-label" hint="Chọn được nhiều nhạc cụ. Bài sẽ hiện trong từng mục tương ứng ở thư viện.">
              Nhạc cụ
            </FieldLabel>
            <InstrumentPicker value={form.instruments} onToggle={toggleInstrument} />
          </div>

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

          <div className="space-y-2">
            <FieldLabel hint="Dạng chữ: cảm âm, hợp âm, tab. Ảnh: sheet hoặc bản chụp.">Loại nội dung</FieldLabel>
            <Segmented
              label="Loại nội dung"
              value={form.kind}
              onChange={(v) => set("kind", v)}
              options={[
                { value: "text", label: "Dạng chữ" },
                { value: "sheet", label: "Ảnh / sheet" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <FieldLabel>Chế độ mặc định</FieldLabel>
              <Segmented
                label="Chế độ mặc định"
                value={form.mode}
                onChange={(v) => set("mode", v)}
                options={[
                  { value: "scroll", label: "Cuộn" },
                  { value: "pages", label: "Sách" },
                ]}
              />
            </div>
            <TextInput
              label="Thời lượng"
              description="phút:giây"
              value={form.duration}
              onChange={(v) => set("duration", v)}
              placeholder="vd 3:40"
              status={durationInvalid ? { type: "error", message: "Nhập dạng phút:giây, từ 0:05 đến 60:00." } : undefined}
              width="100%"
              isDisabled={!editable}
            />
            <TextInput
              label="Nhịp độ (BPM)"
              description="Cho máy đếm nhịp"
              inputMode="numeric"
              value={form.bpm}
              onChange={(v) => set("bpm", v)}
              placeholder="vd 96 (mặc định 80)"
              status={bpmInvalid ? { type: "error", message: "Nhập số nguyên từ 20 đến 400." } : undefined}
              width="100%"
              isDisabled={!editable}
            />
            <div className="space-y-2">
              <div className="flex gap-2">
                <Selector
                  label="Tone gốc"
                  options={KEY_ROOT_OPTIONS}
                  value={form.keyRoot}
                  onChange={(v) => set("keyRoot", v ?? "")}
                  isDisabled={!editable}
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
                />
              </div>
              {guessedKey && (
                <Button size="sm" label={`Đoán từ hợp âm: ${guessedKey}`} onClick={() => setForm((f) => ({ ...f, ...keyParts(guessedKey) }))} />
              )}
            </div>
          </div>

          <Slider
            label="Cỡ chữ / phóng to mặc định"
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

          {form.kind === "text" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <FieldLabel>Nội dung (cảm âm, hợp âm, tab…)</FieldLabel>
                <span className="flex items-center gap-1 text-xs">
                  <span className="mr-1 text-muted-foreground">Mẫu:</span>
                  {(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[]).map((k) => {
                    const active = form.textContent === EXAMPLES[k];
                    return (
                      <ToggleButton
                        key={k}
                        size="sm"
                        label={k}
                        tooltip={`Điền mẫu ${k} vào ô nội dung`}
                        isPressed={active}
                        onPressedChange={() => {
                          const current = form.textContent.trim();
                          const isExample = Object.values(EXAMPLES).includes(form.textContent);
                          if (current && !isExample && !window.confirm(`Thay nội dung đang nhập bằng mẫu “${k}”?`)) return;
                          set("textContent", EXAMPLES[k]);
                        }}
                      >
                        {k}
                      </ToggleButton>
                    );
                  })}
                </span>
              </div>
              <TextArea
                label="Nội dung"
                isLabelHidden
                value={form.textContent}
                onChange={(v) => set("textContent", v)}
                rows={16}
                hasSpellCheck={false}
                controlClassName="font-mono text-sm leading-relaxed"
                placeholder={"Dán bản nhạc dạng chữ, ví dụ cảm âm:\n" + SAMPLE + "\n\n(dòng trống = sang đoạn mới)"}
                width="100%"
                isDisabled={!editable}
              />
              <p className="text-xs text-muted-foreground">
                <b>Cảm âm:</b> dòng lời rồi dòng nốt Do Re Mi… (thêm số cho quãng tám: Re2, D2). <b>Hợp âm:</b> dòng hợp âm
                (Am C G7) đặt trên dòng lời, hoặc chèn ngay trong lời như [Am]Đường về. <b>Tab:</b> các dòng e|--0--|. Dòng
                trống để ngắt đoạn — lật trang sẽ ưu tiên ngắt ở đây.
              </p>
            </div>
          )}

          {editable && (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              width="100%"
              icon={isNew && form.kind === "text" ? <Icon icon={Send} /> : undefined}
              isLoading={saving}
              isDisabled={!form.title.trim() || settingsInvalid || (isNew && form.kind === "text" && !form.textContent.trim())}
              label={
                saving
                  ? isNew && form.kind === "text"
                    ? "Đang gửi…"
                    : "Đang lưu…"
                  : isNew
                    ? form.kind === "sheet"
                      ? "Tiếp tục: tải ảnh lên"
                      : "Gửi duyệt"
                    : "Lưu thay đổi"
              }
            />
          )}
        </fieldset>

        <div className="space-y-3">
          <FieldLabel>Thẻ bài trên thư viện</FieldLabel>
          <ul className="max-w-xs">
            <SongCard preview song={{ ...draftSong, pageCount: pages.length, key: songKey }} />
          </ul>
          <p className="text-xs text-muted-foreground">
            Hiện trong mục:{" "}
            {form.instruments.length ? (
              <b className="text-foreground">{form.instruments.map(instrumentLabel).join(", ")}</b>
            ) : (
              <>
                <b className="text-foreground">Chưa phân loại</b> — chọn nhạc cụ để bài nằm đúng mục
              </>
            )}
          </p>
          {form.kind === "sheet" ? (
            id ? (
              <>
                <FieldLabel>{`Ảnh theo thứ tự${editable ? " (kéo để sắp xếp)" : ""}`}</FieldLabel>
                {editable ? (
                  <ImageUploader songId={id} pages={pages} onChange={onPagesChange} />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {pages.map((p) => (
                      <img key={p.id} src={p.url} alt="" className="rounded border border-border bg-white" />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Card variant="muted" padding={6}>
                <EmptyState isCompact title="Chưa tải ảnh được" description="Tạo bài trước, sau đó tải ảnh lên tại đây." />
              </Card>
            )
          ) : (
            <>
              <FieldLabel>Xem trước</FieldLabel>
              <div className="dark max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-stage-bg py-6 text-stage-fg" style={{ fontSize: `${form.fontScale}rem` }}>
                {form.textContent.trim() ? (
                  <TextNotation text={form.textContent} />
                ) : (
                  <p className="px-6 text-sm text-stage-lyric">Nhập nội dung để xem trước…</p>
                )}
              </div>
            </>
          )}
        </div>
      </form>
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
            {/* persist=false: không dùng cài đặt cũ đã lưu trên máy, luôn theo form; không có nút lưu mặc định */}
            <Stage song={draftSong} persist={false} onBack={() => setPreviewing(false)} />
          </div>,
          document.body,
        )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <SegmentedControl label={label} layout="fill" value={value} onChange={(v) => onChange(v as T)}>
      {options.map((o) => (
        <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
      ))}
    </SegmentedControl>
  );
}
