import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import type { PageImage, Song, SongInput, SongKind, ViewMode } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { TextNotation } from "@/components/stage/TextNotation";
import { LoginDialog } from "@/components/LoginDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdmin } from "@/hooks/useAdmin";
import { api } from "@/lib/api";
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
  instrument: string;
  kind: SongKind;
  textContent: string;
  mode: ViewMode;
  duration: string;
  fontScale: number;
}

const emptyForm: Form = {
  title: "",
  artist: "",
  instrument: "",
  kind: "text",
  textContent: "",
  mode: "scroll",
  duration: "",
  fontScale: 1,
};

function fromSong(s: Song): Form {
  return {
    title: s.title,
    artist: s.artist,
    instrument: s.instrument,
    kind: s.kind,
    textContent: s.textContent,
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
  const { isAdmin } = useAdmin();
  const [loginOpen, setLoginOpen] = useState(false);
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

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const durationSec = form.duration.trim() ? parseDuration(form.duration) : undefined;
  const durationInvalid = durationSec === null || (durationSec !== undefined && (durationSec < 5 || durationSec > 3600));

  const toInput = (): SongInput => ({
    title: form.title.trim(),
    artist: form.artist.trim(),
    instrument: form.instrument.trim(),
    kind: form.kind,
    textContent: form.textContent,
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
    try {
      const saved = isNew ? await api.createSong(toInput()) : await api.updateSong(id!, toInput());
      qc.setQueryData(["song", saved.id], saved);
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success(isNew ? "Đã tạo bài" : "Đã lưu");
      if (isNew) navigate(`/admin/songs/${saved.id}`, { replace: true });
    } catch (err) {
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

  if (!isAdmin) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">Cần đăng nhập quản trị để chỉnh sửa.</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Về thư viện</Link>
          </Button>
          <Button onClick={() => setLoginOpen(true)}>Đăng nhập</Button>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }
  if (id && song.isPending) return <div className="p-10 text-center text-muted-foreground">Đang tải…</div>;
  if (id && song.isError) return <div className="p-10 text-center text-destructive">{song.error.message}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <title>{isNew ? "Bài mới · Gang Muzik" : `Sửa ${form.title} · Gang Muzik`}</title>
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/" aria-label="Về thư viện">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 font-display text-2xl font-bold">{isNew ? "Bài mới" : "Sửa bài"}</h1>
        {!isNew && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={`/s/${id}`}>
                <ExternalLink /> Mở xem
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Xoá bài" onClick={remove}>
              <Trash2 className="text-destructive" />
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Tên bài *</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="artist">Ca sĩ / tác giả</Label>
              <Input id="artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instrument">Nhạc cụ</Label>
              <Input
                id="instrument"
                value={form.instrument}
                onChange={(e) => set("instrument", e.target.value)}
                placeholder="Guitar, Piano, Sáo C…"
                maxLength={100}
              />
            </div>
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

          <Button type="submit" size="lg" className="w-full" disabled={saving || !form.title.trim() || durationInvalid}>
            {saving ? "Đang lưu…" : isNew ? (form.kind === "sheet" ? "Tạo bài rồi tải ảnh" : "Tạo bài") : "Lưu thay đổi"}
          </Button>
        </div>

        <div className="space-y-3">
          {form.kind === "sheet" ? (
            id ? (
              <>
                <Label>Ảnh theo thứ tự (kéo để sắp xếp)</Label>
                <ImageUploader songId={id} pages={pages} onChange={onPagesChange} />
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
