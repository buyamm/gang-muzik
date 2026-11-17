import { memo } from "react";
import type { NoteValue } from "@/lib/notation/transpose";
import { NOTE_CLASS } from "@/lib/notation/colors";
import type { PracticeNote } from "@/lib/practice/scales";
import { cn } from "@/lib/utils";

const GLYPH = { "#": "♯", b: "♭" } as const;

/** tên cảm âm có màu: Si♭ + số quãng tám nhỏ phía trên (giống TextNotation, quãng 1 không ghi số) */
export function NoteLabel({ n, colored = true, className }: { n: NoteValue; colored?: boolean; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", colored && NOTE_CLASS[n.note], className)}>
      {n.note}
      {n.accidental && <span className="ml-[0.02em] text-[0.8em]">{GLYPH[n.accidental]}</span>}
      {n.octave !== 1 && <sup className="ml-[0.04em] text-[0.55em] font-extrabold">{n.octave}</sup>}
    </span>
  );
}

/** dãy nốt của bài tập: chip lớn, nốt đang chơi được tô sáng; bấm một nốt (khi đang dừng) để nghe */
export const NoteChips = memo(function NoteChips({
  seq,
  activeIndex,
  onPick,
}: {
  seq: PracticeNote[];
  activeIndex: number | null;
  onPick?: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap justify-center gap-1.5 sm:gap-2" aria-label="Các nốt của bài tập">
      {seq.map((n, i) => {
        const active = activeIndex === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onPick?.(i)}
              aria-current={active ? "step" : undefined}
              aria-label={`Nốt ${i + 1}: ${n.written.note}${n.written.accidental === "#" ? " thăng" : n.written.accidental === "b" ? " giáng" : ""} quãng ${n.written.octave}`}
              className={cn(
                "flex h-12 min-w-12 items-center justify-center rounded-xl border px-2 font-display text-xl font-bold transition-all duration-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-14 sm:min-w-14 sm:text-2xl",
                n.degree === 1 ? "border-foreground/30 bg-card" : "border-transparent bg-muted/60",
                active && "scale-110 border-primary bg-primary/15 shadow-md ring-2 ring-primary",
              )}
            >
              <NoteLabel n={n.written} />
            </button>
          </li>
        );
      })}
    </ol>
  );
});
