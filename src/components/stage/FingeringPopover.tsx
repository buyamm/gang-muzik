import { useRef, useState } from "react";
import { Hand, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { noteToSemitone, type NoteValue } from "@/lib/notation/transpose";
import { FINGERING_HIGH, FINGERING_LOW, fingeringFor, saxNoteAt } from "@/lib/sax/fingering";
import { cn } from "@/lib/utils";
import { describeFingering, SaxFingeringDiagram } from "./SaxFingeringDiagram";

/** the note the user tapped: written (what the player reads), concert (original token) and its element */
export interface FingeringTarget {
  written: NoteValue;
  concert: NoteValue;
  el: HTMLElement;
  /** viewport rect of `el` when it was tapped */
  rect: { left: number; top: number; width: number; height: number };
}

export function fingeringTarget(written: NoteValue, concert: NoteValue, el: HTMLElement): FingeringTarget {
  const r = el.getBoundingClientRect();
  return { written, concert, el, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
}

const GLYPH = { "#": "♯", b: "♭" } as const;

/** "Sol♯1", "Sib0" (♭ glyph), "Re2" */
export function formatNote(n: NoteValue) {
  return `${n.note}${n.accidental ? GLYPH[n.accidental] : ""}${n.octave}`;
}

const RANGE_TEXT = `${formatNote(saxNoteAt(FINGERING_LOW))}–${formatNote(saxNoteAt(FINGERING_HIGH))}`;

/** one shared popover anchored at the tapped note (position: fixed at its bounding rect) */
export function FingeringPopover({
  target,
  open,
  onOpenChange,
  onOpenChart,
  onPointerDownOutside,
}: {
  /** last tapped note (kept after closing so the exit animation has content) */
  target: FingeringTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** open the full chart, highlighting a written semitone */
  onOpenChart: (semi: number | null) => void;
  /** a tap outside closed the popover (lets the stage ignore that tap) */
  onPointerDownOutside?: () => void;
}) {
  const shown = target;
  const escaped = useRef(false);

  return (
    <Popover open={open && !!target} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span aria-hidden className="pointer-events-none fixed" style={target?.rect ?? { left: 0, top: 0 }} />
      </PopoverAnchor>
      {shown && (
        <PopoverContent
          side="bottom"
          collisionPadding={12}
          className="w-auto max-w-[calc(100vw-1.5rem)] p-4"
          onClick={(e) => e.stopPropagation()}
          onPointerDownOutside={() => onPointerDownOutside?.()}
          onEscapeKeyDown={() => {
            escaped.current = true;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            // keyboard users get focus back on the note they opened
            if (escaped.current && shown.el.isConnected) shown.el.focus({ preventScroll: true });
            escaped.current = false;
          }}
        >
          <FingeringCard
            key={`${noteToSemitone(shown.written)}:${noteToSemitone(shown.concert)}`}
            target={shown}
            onOpenChart={onOpenChart}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

function FingeringCard({ target, onOpenChart }: { target: FingeringTarget; onOpenChart: (semi: number | null) => void }) {
  const semi = noteToSemitone(target.written);
  const fingering = fingeringFor(semi);
  const [alt, setAlt] = useState(-1);
  const transposed = semi !== noteToSemitone(target.concert);
  const keys = fingering ? (alt >= 0 && fingering.alts?.[alt]?.keys) || fingering.keys : [];
  const options = fingering?.alts?.length ? [{ label: "Chuẩn" }, ...fingering.alts] : [];

  const header = (
    <div>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Thế bấm saxophone</div>
      <div className="font-display text-4xl leading-tight font-bold">{formatNote(target.written)}</div>
      {transposed && (
        <div className="text-xs text-muted-foreground">
          Âm thanh thật: <span className="font-semibold text-foreground">{formatNote(target.concert)}</span> (concert)
        </div>
      )}
    </div>
  );
  const chartBtn = (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onOpenChart(fingering ? semi : null)}>
      <Hand /> Xem bảng thế bấm
    </Button>
  );

  if (!fingering) {
    return (
      <div className="w-60 space-y-3">
        {header}
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Ngoài tầm kèn ({RANGE_TEXT})
        </p>
        {chartBtn}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-4">
      <div className="flex items-center rounded-lg bg-muted/50 px-3 py-2 text-foreground">
        <SaxFingeringDiagram keys={keys} height={224} accent />
      </div>
      <div className="flex w-40 flex-col gap-3">
        {header}
        {keys.length === 0 && <p className="text-sm text-muted-foreground">Không bấm phím nào (thả hết ngón).</p>}
        {options.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Cách bấm</div>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label="Cách bấm">
              {options.map((o, i) => {
                const active = alt === i - 1;
                return (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAlt(i - 1)}
                    className={cn(
                      "rounded-md px-2 py-1 text-left text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {fingering.note && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-500" />
            {fingering.note}
          </p>
        )}
        <div className="mt-auto">{chartBtn}</div>
      </div>
    </div>
  );
}

const CHART_ROWS: { title: string; hint: string; from: number; to: number }[] = [
  { title: "Sib0 – Si1", hint: "Quãng thấp", from: FINGERING_LOW, to: 11 },
  { title: "Do2 – Si2", hint: "Như quãng thấp, thêm phím octave", from: 12, to: 23 },
  { title: "Do3 – Fa♯3", hint: "Quãng cao, dùng phím tay", from: 24, to: FINGERING_HIGH },
];

/** the whole written range Sib0..Fa#3 with a mini diagram per note */
export function FingeringChartDialog({
  open,
  onOpenChange,
  highlight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** written semitone to highlight */
  highlight?: number | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88dvh] flex-col gap-3 p-4 sm:max-w-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Bảng thế bấm saxophone</DialogTitle>
          <DialogDescription>
            Theo nốt viết cho kèn (Sib0–Fa♯3), dùng chung cho soprano, alto, tenor, baritone. Phím tô đậm là phím bấm.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-1">
          {CHART_ROWS.map((row) => (
            <section key={row.title}>
              <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                {row.title} <span className="text-xs font-normal text-muted-foreground">{row.hint}</span>
              </h3>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {Array.from({ length: row.to - row.from + 1 }, (_, i) => row.from + i).map((semi) => {
                  const f = fingeringFor(semi)!;
                  const name = formatNote(saxNoteAt(semi));
                  const active = semi === highlight;
                  return (
                    <div
                      key={semi}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-1 pt-1.5 pb-2 text-foreground",
                        active ? "border-primary bg-primary/10" : "border-border bg-muted/30",
                      )}
                    >
                      <span className={cn("text-sm font-bold", active && "text-primary")}>
                        {name}
                        {f.note && <span title={f.note}>*</span>}
                      </span>
                      <SaxFingeringDiagram keys={f.keys} height={112} accent={active} label={`${name}. ${describeFingering(f.keys)}`} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="text-xs text-muted-foreground">* Fa♯3 cần kèn có phím Fa♯ cao.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
