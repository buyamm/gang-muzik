import { useRef, useState } from "react";
import { ExternalLink, Hand, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SaoFingeringDiagram } from "@/components/fingering/SaoFingeringDiagram";
import { fingeringPageUrl } from "@/lib/fingeringPage";
import type { LearnInstrument } from "@/lib/learnInstrument";
import { PUBLIC_URL } from "@/lib/links";
import { noteToSemitone, type NoteValue } from "@/lib/notation/transpose";
import { FINGERING_HIGH, FINGERING_LOW, fingeringFor, saxNoteAt } from "@/lib/sax/fingering";
import { BREATH_LABELS, SAO_HIGH, SAO_LOW, describeHoles, saoFingeringFor, saoNoteAt } from "@/lib/sao/fingering";
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

const RANGE_TEXT: Record<LearnInstrument, string> = {
  sax: `${formatNote(saxNoteAt(FINGERING_LOW))}–${formatNote(saxNoteAt(FINGERING_HIGH))}`,
  sao: `${formatNote(saoNoteAt(SAO_LOW))}–${formatNote(saoNoteAt(SAO_HIGH))}`,
};

const TITLE: Record<LearnInstrument, string> = { sax: "Thế bấm saxophone", sao: "Thế bấm sáo trúc" };

/** absolute link so it also works from Studio (another origin) */
const pageHref = (instrument: LearnInstrument, semi: number | null) => PUBLIC_URL + fingeringPageUrl(instrument, semi);

/** one shared popover anchored at the tapped note (position: fixed at its bounding rect) */
export function FingeringPopover({
  target,
  open,
  onOpenChange,
  onOpenChart,
  onPointerDownOutside,
  instrument = "sax",
}: {
  /** last tapped note (kept after closing so the exit animation has content) */
  target: FingeringTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** open the full chart, highlighting a written semitone */
  onOpenChart: (semi: number | null) => void;
  /** a tap outside closed the popover (lets the stage ignore that tap) */
  onPointerDownOutside?: () => void;
  /** which diagram to show (default saxophone) */
  instrument?: LearnInstrument;
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
            key={`${instrument}:${noteToSemitone(shown.written)}:${noteToSemitone(shown.concert)}`}
            target={shown}
            instrument={instrument}
            onOpenChart={onOpenChart}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

/** "Chuẩn" + alternates as a radio group, with the selected alternate's "when to use" text */
function OptionPicker({
  options,
  value,
  onChange,
}: {
  options: { label: string; description?: string }[];
  value: number;
  onChange: (i: number) => void;
}) {
  if (options.length < 2) return null;
  const desc = options[value + 1]?.description;
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold">Cách bấm</div>
      <div className="flex flex-col gap-1" role="radiogroup" aria-label="Cách bấm">
        {options.map((o, i) => {
          const active = value === i - 1;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(i - 1)}
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
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    </div>
  );
}

function FingeringCard({
  target,
  instrument,
  onOpenChart,
}: {
  target: FingeringTarget;
  instrument: LearnInstrument;
  onOpenChart: (semi: number | null) => void;
}) {
  const semi = noteToSemitone(target.written);
  const sax = instrument === "sax" ? fingeringFor(semi) : null;
  const sao = instrument === "sao" ? saoFingeringFor(semi) : null;
  const found = !!(sax ?? sao);
  const [alt, setAlt] = useState(-1);
  const transposed = semi !== noteToSemitone(target.concert);

  const header = (
    <div>
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{TITLE[instrument]}</div>
      <div className="font-display text-4xl leading-tight font-bold">{formatNote(target.written)}</div>
      {transposed && (
        <div className="text-xs text-muted-foreground">
          Âm thanh thật: <span className="font-semibold text-foreground">{formatNote(target.concert)}</span> (concert)
        </div>
      )}
    </div>
  );
  const chartBtn = (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onOpenChart(found ? semi : null)}>
      <Hand /> Xem bảng thế bấm
    </Button>
  );

  if (!found) {
    return (
      <div className="w-60 space-y-3">
        {header}
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Ngoài tầm {instrument === "sax" ? "kèn" : "sáo"} ({RANGE_TEXT[instrument]})
        </p>
        {chartBtn}
      </div>
    );
  }

  if (sao) {
    const option = (alt >= 0 && sao.alts?.[alt]) || sao;
    const options = sao.alts?.length ? [{ label: "Chuẩn" }, ...sao.alts] : [];
    return (
      <div className="flex w-72 flex-col gap-3">
        {header}
        <div className="rounded-lg bg-muted/50 px-2 py-2 text-foreground">
          <SaoFingeringDiagram holes={option.holes} width={264} accent numbers />
        </div>
        <p className="text-xs">
          <span className="font-semibold">{BREATH_LABELS[option.breath]}</span>
          {sao.note && alt < 0 && <span className="text-muted-foreground"> · {sao.note}</span>}
        </p>
        {option.uncertain && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-500" />
            Thế bấm tham khảo — nên kiểm tra cao độ bằng máy lên dây.
          </p>
        )}
        <OptionPicker options={options} value={alt} onChange={setAlt} />
        {chartBtn}
      </div>
    );
  }

  const f = sax!;
  const keys = (alt >= 0 && f.alts?.[alt]?.keys) || f.keys;
  const options = f.alts?.length ? [{ label: "Chuẩn" }, ...f.alts] : [];
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex items-center rounded-lg bg-muted/50 px-3 py-2 text-foreground">
        <SaxFingeringDiagram keys={keys} height={224} accent />
      </div>
      <div className="flex w-40 flex-col gap-3">
        {header}
        {keys.length === 0 && <p className="text-sm text-muted-foreground">Không bấm phím nào (thả hết ngón).</p>}
        <OptionPicker options={options} value={alt} onChange={setAlt} />
        {f.note && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-500" />
            {f.note}
          </p>
        )}
        <div className="mt-auto">{chartBtn}</div>
      </div>
    </div>
  );
}

const CHART_ROWS: Record<LearnInstrument, { title: string; hint: string; from: number; to: number }[]> = {
  sax: [
    { title: "Sib0 – Si1", hint: "Quãng thấp", from: FINGERING_LOW, to: 11 },
    { title: "Do2 – Si2", hint: "Như quãng thấp, thêm phím octave", from: 12, to: 23 },
    { title: "Do3 – Fa♯3", hint: "Quãng cao, dùng phím tay", from: 24, to: FINGERING_HIGH },
  ],
  sao: [
    { title: "Đô1 – Si1", hint: "Quãng 1, thổi nhẹ", from: SAO_LOW, to: 11 },
    { title: "Đô2 – Si2", hint: "Quãng 2, thế bấm gần như quãng 1, thổi mạnh hơn", from: 12, to: 23 },
    { title: "Đô3", hint: "Quãng 3, thổi rất mạnh", from: 24, to: SAO_HIGH },
  ],
};

/** the whole written range with a mini diagram per note (saxophone Sib0..Fa#3 or sáo Đô1..Đô3) */
export function FingeringChartDialog({
  open,
  onOpenChange,
  highlight,
  instrument = "sax",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** written semitone to highlight */
  highlight?: number | null;
  /** which chart to show (default saxophone) */
  instrument?: LearnInstrument;
}) {
  const sax = instrument === "sax";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88dvh] flex-col gap-3 p-4 sm:max-w-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{sax ? "Bảng thế bấm saxophone" : "Bảng thế bấm sáo trúc 6 lỗ"}</DialogTitle>
          <DialogDescription>
            {sax
              ? "Theo nốt viết cho kèn (Sib0–Fa♯3), dùng chung cho soprano, alto, tenor, baritone. Phím tô đậm là phím bấm."
              : "Theo nốt viết cho sáo (Đô1–Đô3), dùng chung cho mọi cây sáo 6 lỗ. Lỗ tô đậm là bịt, tô nửa là bịt nửa lỗ; lỗ 1 gần lỗ thổi."}
          </DialogDescription>
          <a
            href={pageHref(instrument, highlight ?? null)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Mở trang thế bấm <ExternalLink className="size-3.5" />
          </a>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-1">
          {CHART_ROWS[instrument].map((row) => (
            <section key={row.title}>
              <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                {row.title} <span className="text-xs font-normal text-muted-foreground">{row.hint}</span>
              </h3>
              <div className={cn("grid gap-1.5", sax ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-2 sm:grid-cols-4")}>
                {Array.from({ length: row.to - row.from + 1 }, (_, i) => row.from + i).map((semi) => {
                  const active = semi === highlight;
                  const cell = cn(
                    "flex flex-col items-center gap-1 rounded-md border px-1 pt-1.5 pb-2 text-foreground",
                    active ? "border-primary bg-primary/10" : "border-border bg-muted/30",
                  );
                  if (!sax) {
                    const f = saoFingeringFor(semi)!;
                    const name = formatNote(saoNoteAt(semi));
                    return (
                      <div key={semi} className={cell}>
                        <span className={cn("text-sm font-bold", active && "text-primary")}>
                          {name}
                          {f.uncertain && <span title="Thế bấm tham khảo">*</span>}
                        </span>
                        <SaoFingeringDiagram holes={f.holes} width={140} accent={active} label={`${name}. ${describeHoles(f.holes)}`} />
                        <span className="text-[11px] text-muted-foreground">{BREATH_LABELS[f.breath]}</span>
                      </div>
                    );
                  }
                  const f = fingeringFor(semi)!;
                  const name = formatNote(saxNoteAt(semi));
                  return (
                    <div key={semi} className={cell}>
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
          <p className="text-xs text-muted-foreground">
            {sax
              ? "* Fa♯3 cần kèn có phím Fa♯ cao. Cách bấm phụ của từng nốt: xem trên trang thế bấm."
              : "* Thế bấm tham khảo (nửa cung, quãng 3): nên kiểm tra cao độ bằng máy lên dây."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
