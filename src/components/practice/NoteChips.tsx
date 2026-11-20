import { memo } from "react";
import type { NoteValue } from "@/lib/notation/transpose";
import { NOTE_CLASS } from "@/lib/notation/colors";
import type { PracticeNote } from "@/lib/practice/scales";
import { cn } from "@/lib/utils";

const GLYPH = { "#": "♯", b: "♭" } as const;

/** coloured cảm âm name: Si♭ + small octave number above (like TextNotation; octave 1 has no number) */
export function NoteLabel({ n, colored = true, className }: { n: NoteValue; colored?: boolean; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", colored && NOTE_CLASS[n.note], className)}>
      {n.note}
      {n.accidental && <span className="ml-[0.02em] text-[0.8em]">{GLYPH[n.accidental]}</span>}
      {n.octave !== 1 && <sup className="ml-[0.04em] text-[0.55em] font-extrabold">{n.octave}</sup>}
    </span>
  );
}

/** the exercise notes as large chips; the current note is highlighted, out-of-range notes are dimmed; tap a note (while stopped) to hear it */
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
              title={n.outOfRange ? "Ngoài tầm của kèn" : undefined}
              aria-label={`Nốt ${i + 1}: ${n.written.note}${n.written.accidental === "#" ? " thăng" : n.written.accidental === "b" ? " giáng" : ""} quãng ${n.written.octave}${n.outOfRange ? " (ngoài tầm kèn)" : ""}`}
              className={cn(
                "flex h-12 min-w-12 items-center justify-center rounded-xl border px-2 font-display text-xl font-bold transition-all duration-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-14 sm:min-w-14 sm:text-2xl",
                n.degree === 1 ? "border-foreground/30 bg-card" : "border-transparent bg-muted/60",
                n.outOfRange && "border-dashed border-destructive/60 opacity-50",
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
