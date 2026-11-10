import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { closestCenter, DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { PageImage } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@studio/lib/api";
import { cn } from "@/lib/utils";

const MAX_EDGE = 3200; // đủ nét cho màn hình retina / tablet 2x
const MAX_BYTES = 15 * 1024 * 1024; // giới hạn của server
const KEEP_AS_IS_BYTES = 4 * 1024 * 1024;
const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function dims(blob: Blob) {
  const bmp = await createImageBitmap(blob);
  const d = { width: bmp.width, height: bmp.height };
  bmp.close();
  return d;
}

/**
 * Ưu tiên giữ nét:
 * - "Giữ ảnh gốc": tải nguyên file (JPEG/PNG/WebP ≤ 15MB), không nén.
 * - Mặc định: ảnh đã vừa (≤ 3200px, ≤ 4MB) thì giữ nguyên; ảnh lớn hơn mới thu về 3200px, WebP chất lượng 92%.
 * - Ảnh HEIC (iPhone) / định dạng khác: luôn chuyển sang WebP chất lượng cao.
 */
async function prepareImage(file: File, keepOriginal: boolean) {
  const webType = WEB_TYPES.includes(file.type);
  if (webType) {
    const d = await dims(file);
    const small = Math.max(d.width, d.height) <= MAX_EDGE && file.size <= KEEP_AS_IS_BYTES;
    if ((keepOriginal && file.size <= MAX_BYTES) || small) return { blob: file as Blob, ...d };
  }
  let blob: Blob = await imageCompression(file, {
    maxWidthOrHeight: keepOriginal ? 6000 : MAX_EDGE,
    maxSizeMB: 14, // không ép dung lượng — tránh hạ chất lượng
    fileType: "image/webp",
    initialQuality: 0.92,
    useWebWorker: true,
  });
  // trình duyệt không xuất được WebP (Safari cũ) hoặc file vẫn quá nặng → JPEG chất lượng cao
  if (!WEB_TYPES.includes(blob.type) || blob.size > MAX_BYTES) {
    blob = await imageCompression(file, {
      maxWidthOrHeight: MAX_EDGE,
      maxSizeMB: 14,
      fileType: "image/jpeg",
      initialQuality: 0.92,
      useWebWorker: true,
    });
  }
  return { blob, ...(await dims(blob)) };
}

export function ImageUploader({
  songId,
  pages,
  onChange,
}: {
  songId: string;
  pages: PageImage[];
  onChange: (pages: PageImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;
      let current = pagesRef.current;
      for (const [i, f] of images.entries()) {
        setBusy(`Đang tải ảnh ${i + 1}/${images.length}…`);
        try {
          const { blob, width, height } = await prepareImage(f, keepOriginal);
          const page = await api.uploadPage(songId, blob, width, height);
          current = [...current, page];
          onChange(current);
        } catch (e) {
          toast.error(`Lỗi ảnh “${f.name}”: ${(e as Error).message}`);
        }
      }
      setBusy(null);
    },
    [songId, onChange, keepOriginal],
  );

  // dán ảnh chụp màn hình bằng Ctrl/Cmd+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        upload(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = pages.findIndex((p) => p.id === e.active.id);
    const to = pages.findIndex((p) => p.id === e.over!.id);
    const next = arrayMove(pages, from, to);
    onChange(next);
    try {
      await api.reorderPages(songId, next.map((p) => p.id));
    } catch (err) {
      toast.error((err as Error).message);
      onChange(pages);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xoá ảnh này?")) return;
    try {
      await api.deletePage(id);
      onChange(pages.filter((p) => p.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        disabled={!!busy}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/10" : "hover:border-primary/50 hover:bg-accent/30",
        )}
      >
        {busy ? <Loader2 className="size-7 animate-spin text-primary" /> : <ImagePlus className="size-7 text-primary" />}
        <span className="font-medium">{busy ?? "Chọn, kéo thả hoặc dán (Ctrl/⌘+V) ảnh"}</span>
        <span className="text-xs text-muted-foreground">
          {keepOriginal
            ? "Tải nguyên ảnh gốc, không nén (tối đa 15MB/ảnh)"
            : "Giữ nét: ảnh vừa thì giữ nguyên, ảnh rất lớn mới thu về 3200px (WebP 92%)"}{" "}
          · chọn được nhiều ảnh
        </span>
      </button>
      <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">Giữ nguyên ảnh gốc</span>
          <span className="block text-xs text-muted-foreground">Nét tối đa, file nặng hơn — dùng cho sheet chữ nhỏ</span>
        </span>
        <Switch checked={keepOriginal} onCheckedChange={setKeepOriginal} />
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {pages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {pages.map((p, i) => (
                <SortableItem key={p.id} page={p} index={i} onRemove={() => remove(p.id)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableItem({ page, index, onRemove }: { page: PageImage; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 rounded-lg border bg-card p-2", isDragging && "z-10 shadow-lg ring-2 ring-primary")}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing"
        aria-label="Kéo để sắp xếp"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="w-6 text-center font-mono text-sm text-muted-foreground">{index + 1}</span>
      <img src={page.url} alt="" className="h-16 w-24 rounded bg-white object-cover object-top" />
      <span className="flex-1 text-xs text-muted-foreground">
        {page.width}×{page.height}
      </span>
      <Button type="button" variant="ghost" size="icon" aria-label="Xoá ảnh" onClick={onRemove}>
        <Trash2 className="text-destructive" />
      </Button>
    </li>
  );
}
