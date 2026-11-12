import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Eye, Lock, Send, Trash2, Undo2, X } from "lucide-react";
import type { PageImage, Song, SongInput, SongKind, ViewMode } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@studio/components/ImageUploader";
import { StatusBadge } from "@studio/components/StatusBadge";
import { TextNotation } from "@/components/stage/TextNotation";
import { canDelete, canEdit, canSubmit, type SongRef } from "@shared/permissions";
import { INSTRUMENTS, parseInstruments, type InstrumentId } from "@shared/instruments";
import { useMe } from "@studio/hooks/useMe";
import { api } from "@studio/lib/api";
import { formatDuration, parseDuration } from "@/lib/stage/math";
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
};

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
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || durationInvalid) return;
    setSaving(true);
    // bài mới: mở sẵn tab trống ngay trong lúc bấm (mở sau khi chờ API sẽ bị trình duyệt chặn popup)
    const tab = isNew ? window.open("", "_blank") : null;
    try {
      const saved = isNew ? await api.createSong(toInput()) : await api.updateSong(id!, toInput());
      qc.setQueryData(["song", saved.id], saved);
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success(isNew ? "Đã tạo bài" : "Đã lưu");
      if (isNew) {
        // tab mới mở bài vừa tạo; tab này quay về danh sách bài của tôi
        if (tab) {
          tab.opener = null;
          tab.location.replace(`/songs/${saved.id}`);
          navigate("/", { replace: true });
        } else {
          // trình duyệt chặn tab mới → mở bài ngay tại tab này như cũ
          navigate(`/songs/${saved.id}`, { replace: true });
        }
      }
    } catch (err) {
      tab?.close();
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm(`Xoá bài “${form.title}” và toàn bộ ảnh? Không thể hoàn tác.`)) return;
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
    try {
      if (editable) await api.updateSong(id, toInput());
      const s = await api.submitSong(id);
      qc.setQueryData(["song", id], s);
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Đã gửi duyệt — bài sẽ lên thư viện khi quản trị viên duyệt");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const review = async (decision: "approve" | "reject" | "unpublish") => {
    if (!id) return;
    if (decision === "reject" && !reviewNote.trim()) return toast.error("Ghi lý do từ chối để người đăng biết cần sửa gì");
    if (decision === "unpublish" && !window.confirm("Gỡ bài khỏi thư viện công khai (chuyển về Nháp)?")) return;
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
  if (id && song.isError) return <div className="p-10 text-center text-destructive">{song.error.message}</div>;

  return (
    <div>
      <title>{isNew ? "Bài mới · Gang Muzik Studio" : `${form.title} · Gang Muzik Studio`}</title>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/" aria-label="Quay lại">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">{isNew ? "Bài mới" : editable ? "Sửa bài" : "Xem bài"}</h1>
        {song.data?.status && <StatusBadge status={song.data.status} />}
        <div className="flex-1" />
        {!isNew && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={`/songs/${id}/preview`}>
                <Eye /> Xem thử
              </Link>
            </Button>
            {deletable && (
              <Button variant="ghost" size="icon" aria-label="Xoá bài" title="Xoá bài" onClick={remove}>
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* trạng thái duyệt */}
      {song.data && (
        <div className="mb-6 space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1">
              {song.data.status === "draft" && "Bài đang là Nháp — chỉ bạn và quản trị viên thấy. Xong thì bấm Gửi duyệt."}
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
              <Button onClick={submit} disabled={busy || !form.title.trim() || durationInvalid}>
                <Send /> Gửi duyệt
              </Button>
            )}
            {!editable && <Lock className="size-4 text-muted-foreground" aria-label="Đã khoá" />}
          </div>
          {song.data.reviewNote && song.data.status !== "approved" && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <b>Góp ý của quản trị viên:</b> {song.data.reviewNote}
            </p>
          )}
          {isAdmin && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-sm font-semibold">Duyệt bài (quản trị viên)</div>
              {song.data.status !== "approved" && (
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Lý do / góp ý (bắt buộc khi từ chối)"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {song.data.status !== "approved" && (
                  <>
                    <Button size="sm" onClick={() => review("approve")} disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-600/90">
                      <Check /> Duyệt & đăng lên thư viện
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review("reject")} disabled={busy} className="text-destructive">
                      <X /> Từ chối
                    </Button>
                  </>
                )}
                {song.data.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => review("unpublish")} disabled={busy}>
                    <Undo2 /> Gỡ khỏi thư viện
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <fieldset disabled={!editable} className="min-w-0 space-y-5 disabled:opacity-70">
          <div className="space-y-2">
            <Label htmlFor="title">Tên bài *</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">Ca sĩ / tác giả</Label>
            <Input id="artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label id="instrument-label">Nhạc cụ</Label>
            <p className="text-xs text-muted-foreground">Chọn được nhiều nhạc cụ. Bài sẽ hiện trong từng mục tương ứng ở thư viện.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="instrument-label">
              {INSTRUMENTS.map((i) => {
                const on = form.instruments.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInstrument(i.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {on && <Check className="-ml-0.5 size-3.5" />}
                    {i.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú cho người chơi</Label>
            <p className="text-xs text-muted-foreground">Hiện trên đầu bài cho mọi người xem — vd tone, capo, nhịp, đoạn cần chú ý.</p>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Tone Am · capo 2 · điệp khúc đánh mạnh hơn…"
            />
          </div>

          <div className="space-y-2">
            <Label>Loại nội dung</Label>
            <Segmented
              value={form.kind}
              onChange={(v) => set("kind", v)}
              options={[
                { value: "text", label: "Dạng chữ (cảm âm, hợp âm, tab)" },
                { value: "sheet", label: "Ảnh (sheet / bản chụp)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Chế độ mặc định</Label>
              <Segmented
                value={form.mode}
                onChange={(v) => set("mode", v)}
                options={[
                  { value: "scroll", label: "Cuộn" },
                  { value: "pages", label: "Sách" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Thời lượng bài (phút:giây)</Label>
              <Input
                id="duration"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="vd 3:40 — để trống = tự ước lượng"
                aria-invalid={durationInvalid}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Cỡ chữ / phóng to mặc định: {Math.round(form.fontScale * 100)}%</Label>
            <Slider min={0.6} max={2.5} step={0.05} value={[form.fontScale]} onValueChange={([v]) => set("fontScale", v)} />
          </div>

          {form.kind === "text" && (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <Label htmlFor="text">Nội dung (cảm âm, hợp âm, tab…)</Label>
                <span className="flex items-center gap-1 text-xs">
                  <span className="mr-1 text-muted-foreground">Mẫu:</span>
                  {(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[]).map((k) => {
                    const active = form.textContent === EXAMPLES[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={active}
                        title={`Điền mẫu ${k} vào ô nội dung`}
                        className={cn(
                          "rounded-md px-2 py-0.5 font-medium transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10",
                        )}
                        onClick={() => {
                          const current = form.textContent.trim();
                          const isExample = Object.values(EXAMPLES).includes(form.textContent);
                          if (current && !isExample && !window.confirm(`Thay nội dung đang nhập bằng mẫu “${k}”?`)) return;
                          set("textContent", EXAMPLES[k]);
                        }}
                      >
                        {k}
                      </button>
                    );
                  })}
                </span>
              </div>
              <Textarea
                id="text"
                value={form.textContent}
                onChange={(e) => set("textContent", e.target.value)}
                rows={16}
                className="font-mono text-sm leading-relaxed"
                placeholder={"Dán bản nhạc dạng chữ, ví dụ cảm âm:\n" + SAMPLE + "\n\n(dòng trống = sang đoạn mới)"}
              />
              <p className="text-xs text-muted-foreground">
                <b>Cảm âm:</b> dòng lời rồi dòng nốt Do Re Mi… (thêm số cho quãng tám: Re2, D2). <b>Hợp âm:</b> dòng hợp âm
                (Am C G7) đặt trên dòng lời, hoặc chèn ngay trong lời như [Am]Đường về. <b>Tab:</b> các dòng e|--0--|. Dòng
                trống để ngắt đoạn — lật trang sẽ ưu tiên ngắt ở đây.
              </p>
            </div>
          )}

          {editable && (
            <Button type="submit" size="lg" className="w-full" disabled={saving || !form.title.trim() || durationInvalid}>
              {saving ? "Đang lưu…" : isNew ? (form.kind === "sheet" ? "Tạo bài rồi tải ảnh" : "Tạo bài nháp") : "Lưu thay đổi"}
            </Button>
          )}
        </fieldset>

        <div className="space-y-3">
          {form.kind === "sheet" ? (
            id ? (
              <>
                <Label>Ảnh theo thứ tự{editable ? " (kéo để sắp xếp)" : ""}</Label>
                {editable ? (
                  <ImageUploader songId={id} pages={pages} onChange={onPagesChange} />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {pages.map((p) => (
                      <img key={p.id} src={p.url} alt="" className="rounded border bg-white" />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Tạo bài trước, sau đó tải ảnh lên tại đây.
              </div>
            )
          ) : (
            <>
              <Label>Xem trước</Label>
              <div className="dark max-h-[75vh] overflow-y-auto rounded-xl border bg-stage-bg py-6 text-stage-fg" style={{ fontSize: `${form.fontScale}rem` }}>
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
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
