import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ScanText } from "lucide-react";
import type { PageImage } from "@shared/types";
import { fixNoteLyricOrder, joinTranscriptions } from "@shared/transcribe";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextNotation } from "@/components/stage/TextNotation";
import { isNoteLine, parseNotation } from "@/lib/notation/parse";
import { api } from "@studio/lib/api";

/** edge length sent to the AI: enough to read note names, small enough to stay fast */
const AI_MAX_EDGE = 1600;

async function downscaleForAi(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Không tải được ảnh (${res.status})`);
  const bmp = await createImageBitmap(await res.blob());
  const scale = Math.min(1, AI_MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  // transparent PNGs → white paper
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh"))), "image/jpeg", 0.88),
  );
}

/** counts lines the parser recognised as notes or chords */
function countMusicRows(text: string) {
  return parseNotation(text)
    .flatMap((s) => s.rows)
    .filter((r) => r.notes?.some((t) => t.type === "note") || r.chords || r.tab).length;
}

/**
 * Text version of an image song: AI reads the pages, the uploader reviews/fixes the result.
 * The text is saved with the song form ("Lưu thay đổi"), so it goes through review like the rest.
 */
export function TranscribePanel({
  songId,
  pages,
  value,
  onChange,
  editable,
  fontScale,
}: {
  songId: string;
  pages: PageImage[];
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  fontScale: number;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  /** true when some page had no written cảm âm (AI read the staff itself) */
  const [readStaff, setReadStaff] = useState(false);

  const run = async () => {
    if (!pages.length) return toast.error("Tải ảnh lên trước");
    if (value.trim() && !window.confirm("Thay bản chữ hiện có bằng kết quả nhận dạng mới?")) return;
    setProgress({ done: 0, total: pages.length });
    setReadStaff(false);
    const parts: string[] = [];
    let staffOnly = false;
    try {
      for (const [i, p] of pages.entries()) {
        const blob = await downscaleForAi(p.url);
        const r = await api.transcribe(songId, blob);
        parts.push(fixNoteLyricOrder(r.text, isNoteLine));
        if (!r.hasSolfege) staffOnly = true;
        setProgress({ done: i + 1, total: pages.length });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
    if (!parts.length) return;
    const text = joinTranscriptions(parts);
    onChange(text);
    setReadStaff(staffOnly);
    if (!countMusicRows(text)) toast.warning("AI không nhận ra dòng nốt nào — hãy kiểm tra hoặc nhập tay");
    else toast.success("Đã nhận dạng xong — kiểm tra lại rồi bấm “Lưu thay đổi”");
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label htmlFor="sheet-text">Bản chữ (để dịch giọng)</Label>
          <p className="text-xs text-muted-foreground">
            Người xem có thể chuyển giữa “Ảnh gốc” và “Bản chữ”; chỉ bản chữ mới dịch giọng được.
          </p>
        </div>
        {editable && (
          <Button type="button" variant="secondary" size="sm" onClick={run} disabled={!!progress || !pages.length}>
            {progress ? <Loader2 className="animate-spin" /> : <ScanText />}
            {progress ? `Đang đọc trang ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : "Nhận dạng từ ảnh"}
          </Button>
        )}
      </div>

      {readStaff && (
        <p className="flex gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          Có trang không ghi sẵn cảm âm nên AI tự đọc khuông nhạc — kết quả dễ sai nốt, hãy dò lại từng dòng. Trường độ (nhịp) không
          được giữ.
        </p>
      )}

      <Textarea
        id="sheet-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!editable}
        rows={12}
        className="font-mono text-sm leading-relaxed"
        placeholder={"Bấm “Nhận dạng từ ảnh” hoặc tự nhập:\nlời bài hát\nSol La Si Re2 …\n\n(để trống nếu không cần bản chữ)"}
      />
      {value.trim() && (
        <div
          className="dark max-h-[50vh] overflow-y-auto rounded-xl border bg-stage-bg py-4 text-stage-fg"
          style={{ fontSize: `${fontScale}rem` }}
        >
          <TextNotation text={value} />
        </div>
      )}
    </div>
  );
}
