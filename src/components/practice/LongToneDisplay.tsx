import type { RunnerStep } from "@/hooks/usePracticeRunner";
import type { PracticeNote } from "@/lib/practice/scales";
import { cn } from "@/lib/utils";
import { NoteLabel } from "./NoteChips";

const R = 88;
const CIRC = 2 * Math.PI * R;

/** long tone: very large note name + progress ring (full ring = all hold beats done) */
export function LongToneDisplay({
  seq,
  step,
  hold,
  rest,
}: {
  seq: PracticeNote[];
  step: RunnerStep | null;
  hold: number;
  rest: number;
}) {
  const idle = !step;
  const index = step && step.phase !== "countin" ? step.index : 0;
  const resting = step?.phase === "rest";
  const shown = resting ? seq[(index + 1) % seq.length] : seq[index];
  const progress = step?.phase === "note" ? (step.beat + 1) / hold : resting ? 1 : 0;
  const beatsLeft = step?.phase === "note" ? hold - step.beat : step?.phase === "rest" ? rest - step.beat : hold;

  return (
    <div className="flex flex-col items-center gap-3" aria-live="polite">
      <div className="relative size-56 sm:size-64">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            className={cn(
              "transition-[stroke-dashoffset] duration-300 ease-linear",
              resting ? "stroke-muted-foreground/40" : "stroke-primary",
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {step?.phase === "countin" ? (
            <span className="font-display text-7xl font-extrabold tabular-nums">{step.left}</span>
          ) : shown ? (
            <>
              <span className={cn("font-display text-7xl font-extrabold sm:text-8xl", resting && "opacity-40")}>
                <NoteLabel n={shown.written} />
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                {idle ? `${hold} phách mỗi nốt` : resting ? "Nghỉ — nốt tiếp theo" : `Giữ ${beatsLeft} phách`}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">
        Nốt {Math.min(index + 1, seq.length)}/{seq.length}
      </div>
    </div>
  );
}
