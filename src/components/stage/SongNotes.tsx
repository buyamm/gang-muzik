import { useEffect, useState } from "react";
import { ChevronDown, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { readPref, removePref, writePref } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export const PERSONAL_NOTE_MAX = 2000;

const noteKey = (songId: string) => `gm:note:${songId}`;

/** ghi chú riêng của người xem — chỉ lưu trên máy này */
export function usePersonalNote(songId: string) {
  const key = noteKey(songId);
  const [text, setText] = useState(() => readPref(key, { text: "" }).text);
  const save = (next: string) => {
    const v = next.trim().slice(0, PERSONAL_NOTE_MAX);
    setText(v);
    if (v) writePref(key, { text: v });
    else removePref(key);
  };
  return [text, save] as const;
}

export interface NotesData {
  /** ghi chú công khai của người đăng */
  author: string;
  /** ghi chú riêng của người xem */
  personal: string;
  /** đang mở rộng (hiện đủ các dòng) hay thu gọn một dòng */
  expanded: boolean;
  onToggle: () => void;
}

const oneLine = (t: string) =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" · ");

/**
 * dải ghi chú gọn trên đầu bài: mặc định một dòng, chạm để xem đủ.
 * Cỡ chữ cố định (rem) — không phình theo nút phóng to bản nhạc.
 */
export function NotesBox({ notes, fit }: { notes: NotesData; fit?: boolean }) {
  const author = notes.author.trim();
  const personal = notes.personal.trim();
  if (!author && !personal) return null;
  const { expanded } = notes;
  return (
    <div data-break className={fit ? "px-1 pb-4" : "mx-auto max-w-5xl px-5 pb-5 sm:px-10"}>
      <button
        type="button"
        aria-expanded={expanded}
        title={expanded ? "Thu gọn ghi chú" : "Xem đủ ghi chú"}
        onClick={(e) => {
          e.stopPropagation();
          notes.onToggle();
        }}
        className={cn(
          "group flex w-full items-start gap-2 rounded-lg border border-stage-note/45 bg-stage-note/15 px-3 py-2 text-left text-sm leading-snug font-medium text-stage-fg",
          "transition-colors hover:border-stage-note/70 hover:bg-stage-note/22 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <StickyNote className="mt-[0.15em] size-4 shrink-0 text-stage-note" aria-hidden />
        {expanded ? (
          <span className="min-w-0 flex-1 space-y-1">
            {author && <span className="block break-words whitespace-pre-line text-stage-fg">{author}</span>}
            {personal && (
              <span className="block break-words whitespace-pre-line">
                <span className="font-semibold text-stage-note">Của bạn: </span>
                <span className="text-stage-fg">{personal}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate">
            {author && <span className="text-stage-fg">{oneLine(author)}</span>}
            {author && personal && <span className="mx-2 text-stage-note/70">•</span>}
            {personal && (
              <>
                <span className="font-semibold text-stage-note">Của bạn: </span>
                <span className="text-stage-fg">{oneLine(personal)}</span>
              </>
            )}
          </span>
        )}
        <ChevronDown
          className={cn("mt-[0.15em] size-4 shrink-0 text-stage-note/75 transition-transform group-hover:text-stage-note", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function NotesDialog({
  open,
  onOpenChange,
  authorNote,
  personalNote,
  onSavePersonal,
  visible,
  onVisible,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  authorNote: string;
  personalNote: string;
  onSavePersonal: (text: string) => void;
  visible: boolean;
  onVisible: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState(personalNote);
  useEffect(() => {
    if (open) setDraft(personalNote);
  }, [open, personalNote]);

  const save = () => {
    onSavePersonal(draft);
    if (draft.trim()) onVisible(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ghi chú</DialogTitle>
          <DialogDescription>Ghi chú hiện trên đầu bài để bạn nhớ khi chơi.</DialogDescription>
        </DialogHeader>

        {authorNote.trim() && (
          <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
            <div className="mb-0.5 text-xs font-semibold text-muted-foreground">Ghi chú của người đăng</div>
            <p className="break-words whitespace-pre-line">{authorNote}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="personal-note">Ghi chú của bạn</Label>
          <Textarea
            id="personal-note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={PERSONAL_NOTE_MAX}
            rows={5}
            autoFocus
            placeholder="Capo 2 · hạ tone · đoạn điệp khúc đánh chậm lại…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
          />
          <p className="text-xs text-muted-foreground">Chỉ lưu trên thiết bị này, không ai khác thấy.</p>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Hiện ghi chú trên đầu bài</span>
          <Switch checked={visible} onCheckedChange={onVisible} />
        </label>

        <DialogFooter className="gap-2 sm:justify-between">
          {personalNote ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onSavePersonal("");
                onOpenChange(false);
              }}
            >
              Xoá ghi chú của tôi
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={save}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
