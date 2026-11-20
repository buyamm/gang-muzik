import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Link2, TriangleAlert, Volume2, Wind } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/brand/Staff";
import { SaxFingeringDiagram, describeFingering } from "@/components/stage/SaxFingeringDiagram";
import { SaoFingeringDiagram } from "@/components/fingering/SaoFingeringDiagram";
import { playTone } from "@/lib/audio/engine";
import {
  concertFrequency,
  fingeringSearch,
  noteAt,
  parseFingeringParams,
  rangeOf,
  typesFor,
  type FingeringPageState,
} from "@/lib/fingeringPage";
import { readLearnInstrument, writeLearnInstrument, type LearnInstrument } from "@/lib/learnInstrument";
import { semitoneToNote, type NoteValue } from "@/lib/notation/transpose";
import { fingeringFor } from "@/lib/sax/fingering";
import { BREATH_LABELS, describeHoles, saoFingeringFor, type SaoOption } from "@/lib/sao/fingering";
import type { SaxKey } from "@/lib/sax/fingering";
import { cn } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { FINGERING_SEO } from "@shared/seo";

const GLYPH = { "#": "♯", b: "♭" } as const;
const fmt = (n: NoteValue) => `${n.note}${n.accidental ? GLYPH[n.accidental] : ""}${n.octave}`;
const name = (n: NoteValue) => `${n.note}${n.accidental ? GLYPH[n.accidental] : ""}`;

/** text colour per natural note (theme tokens) */
const NOTE_TEXT: Record<NoteValue["note"], string> = {
  Do: "text-note-do",
  Re: "text-note-re",
  Mi: "text-note-mi",
  Fa: "text-note-fa",
  Sol: "text-note-sol",
  La: "text-note-la",
  Si: "text-note-si",
};

const LETTERS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/** concert pitch as cảm âm (Do1 = C4) and scientific name: "Mi♭0 · E♭3" */
function concertLabel(abs: number) {
  const pc = ((abs % 12) + 12) % 12;
  const caml = semitoneToNote(abs, [1, 3, 8, 10].includes(pc) ? "flat" : "sharp");
  return `${fmt(caml)} · ${LETTERS[pc]}${Math.floor(abs / 12) + 4}`;
}

const INSTRUMENTS: { id: LearnInstrument; label: string; hint: string }[] = [
  { id: "sax", label: "Saxophone", hint: "Sib0 – Fa♯3" },
  { id: "sao", label: "Sáo trúc 6 lỗ", hint: "Đô1 – Đô3" },
];

/** one fingering (main or alternate) shown as a card */
interface OptionCard {
  label: string;
  description?: string;
  primary: boolean;
  sax?: SaxKey[];
  sao?: SaoOption;
}

function optionsFor(instrument: LearnInstrument, semi: number): { cards: OptionCard[]; note?: string } {
  if (instrument === "sax") {
    const f = fingeringFor(semi);
    if (!f) return { cards: [] };
    return {
      note: f.note,
      cards: [
        { label: "Cách bấm chuẩn", primary: true, sax: f.keys },
        ...(f.alts ?? []).map((a) => ({ label: a.label, description: a.description, primary: false, sax: a.keys })),
      ],
    };
  }
  const f = saoFingeringFor(semi);
  if (!f) return { cards: [] };
  return {
    cards: [
      { label: "Cách bấm chuẩn", description: f.note, primary: true, sao: f },
      ...(f.alts ?? []).map((a) => ({ label: a.label, description: a.description, primary: false, sao: a })),
    ],
  };
}

export function Fingering() {
  useSeo(FINGERING_SEO);
  const [params, setParams] = useSearchParams();
  // instrument from the URL, else the one the visitor learned last
  const state = useMemo(() => parseFingeringParams(params, readLearnInstrument()), [params]);
  const { instrument, type, semi } = state;
  const types = typesFor(instrument);
  const typeInfo = types.find((t) => t.id === type) ?? types[0];

  const go = (patch: Partial<FingeringPageState>) => {
    const next = { ...state, ...patch };
    if (patch.instrument && patch.instrument !== instrument) {
      writeLearnInstrument(patch.instrument);
      const fresh = parseFingeringParams(new URLSearchParams({ i: patch.instrument }));
      Object.assign(next, { type: fresh.type, semi: fresh.semi });
    }
    setParams(new URLSearchParams(fingeringSearch(next)), { replace: true });
  };

  const written = noteAt(instrument, semi);
  const concertAbs = semi + typeInfo.offset;
  const { cards, note } = optionsFor(instrument, semi);

  const copyLink = async () => {
    const url = `${location.origin}/fingering${fingeringSearch(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast(url);
    }
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Về thư viện">
              <ArrowLeft />
            </Link>
          </Button>
          <Link to="/" className="flex flex-1 items-center gap-2">
            <LogoMark className="size-7" />
            <span className="font-display text-base font-bold">Gang Muzik</span>
          </Link>
          <ThemeToggle />
        </header>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Tra thế bấm</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Chọn nhạc cụ và nốt để xem cách bấm chuẩn cùng mọi cách bấm phụ, kèm lúc nào nên dùng. Nốt viết theo cảm âm của nhạc cụ
            (đọc thẳng trên bản nhạc đã dịch giọng).
          </p>
        </div>

        {/* instrument + type */}
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5" aria-label="Chọn nhạc cụ">
          <div role="radiogroup" aria-label="Nhạc cụ" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-grid sm:w-auto">
            {INSTRUMENTS.map((i) => {
              const active = i.id === instrument;
              return (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => go({ instrument: i.id })}
                  className={cn(
                    "rounded-md px-4 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="block text-sm font-semibold">{i.label}</span>
                  <span className="block text-xs text-muted-foreground">{i.hint}</span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-1.5 text-sm font-semibold">{instrument === "sax" ? "Loại kèn" : "Cây sáo"}</div>
            <div role="radiogroup" aria-label={instrument === "sax" ? "Loại kèn" : "Cây sáo"} className="flex flex-wrap gap-1.5">
              {types.map((t) => {
                const active = t.id === typeInfo.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => go({ type: t.id })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/40",
                    )}
                  >
                    {instrument === "sax" ? `${t.label} (${t.key})` : t.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {instrument === "sax"
                ? "Thế bấm giống nhau cho mọi loại kèn; loại kèn chỉ đổi âm thanh thật (concert)."
                : "Thế bấm giống nhau cho mọi cây sáo 6 lỗ; cây sáo chỉ đổi âm thanh thật. Bịt kín 6 lỗ là nốt Đô của sáo."}
            </p>
          </div>

          <NotePicker instrument={instrument} value={semi} onChange={(s) => go({ semi: s })} />
        </section>

        {/* selected note */}
        <section className="mt-6" aria-live="polite">
          <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {instrument === "sax" ? `Saxophone ${typeInfo.label}` : `Sáo trúc · ${typeInfo.label}`}
              </div>
              <div className={cn("font-display text-6xl leading-none font-bold", NOTE_TEXT[written.note])}>{fmt(written)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Âm thanh thật: <span className="font-semibold text-foreground">{concertLabel(concertAbs)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => playTone(concertFrequency(instrument, typeInfo.id, semi), 1.4)}>
                <Volume2 /> Nghe âm mẫu
              </Button>
              <Button type="button" variant="outline" onClick={copyLink}>
                <Link2 /> Sao chép liên kết
              </Button>
            </div>
          </div>

          {note && (
            <p className="mb-4 flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              {note}
            </p>
          )}

          <div className={cn("grid gap-4", instrument === "sax" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
            {cards.map((c) => (
              <OptionView key={c.label} card={c} noteName={fmt(written)} />
            ))}
          </div>
          {cards.length > 1 && (
            <p className="mt-3 text-sm text-muted-foreground">Nốt này có {cards.length} cách bấm — chọn theo nốt đứng trước và sau trong câu nhạc.</p>
          )}
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

function OptionView({ card, noteName }: { card: OptionCard; noteName: string }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-4",
        card.primary ? "border-primary/50 bg-primary/5" : "bg-card",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">{card.label}</h2>
        {card.primary && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Chuẩn</span>}
        {card.sao?.uncertain && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300" title="Chưa đối chiếu đủ nguồn — nên kiểm tra bằng máy lên dây">
            Tham khảo
          </span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg bg-muted/40 px-2 py-4 text-foreground">
        {card.sax && (
          <SaxFingeringDiagram keys={card.sax} height={280} accent label={`${noteName}, ${card.label}. ${describeFingering(card.sax)}`} />
        )}
        {card.sao && (
          <SaoFingeringDiagram
            holes={card.sao.holes}
            width={340}
            numbers
            accent
            className="h-auto max-w-full"
            label={`${noteName}, ${card.label}. Sáo trúc: ${describeHoles(card.sao.holes)}`}
          />
        )}
      </div>
      {card.sao && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
          <Wind className="size-4 text-primary" /> {BREATH_LABELS[card.sao.breath]}
        </p>
      )}
      {card.sax && card.sax.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Không bấm phím nào (thả hết ngón).</p>}
      {card.description && <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>}
    </article>
  );
}

/** cảm âm chips grouped by octave; naturals large and coloured, accidentals small */
function NotePicker({ instrument, value, onChange }: { instrument: LearnInstrument; value: number; onChange: (s: number) => void }) {
  const r = rangeOf(instrument);
  const rows = useMemo(() => {
    const byOctave = new Map<number, { semi: number; n: NoteValue }[]>();
    for (let s = r.low; s <= r.high; s++) {
      const n = noteAt(instrument, s);
      const list = byOctave.get(n.octave) ?? [];
      list.push({ semi: s, n });
      byOctave.set(n.octave, list);
    }
    return [...byOctave.entries()];
  }, [instrument, r.low, r.high]);

  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">Nốt</div>
      <div className="space-y-2" role="radiogroup" aria-label="Chọn nốt">
        {rows.map(([octave, notes]) => (
          <div key={octave} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">Quãng {octave}</span>
            <div className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-0.5">
              {notes.map(({ semi, n }) => {
                const active = semi === value;
                const accidental = !!n.accidental;
                return (
                  <button
                    key={semi}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={fmt(n)}
                    onClick={() => onChange(semi)}
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-md border font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      accidental ? "h-9 min-w-10 px-1.5 text-xs" : "h-9 min-w-12 px-2 text-sm",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : accidental
                          ? "border-dashed bg-muted/50 text-muted-foreground hover:text-foreground"
                          : cn("bg-background hover:border-foreground/40", NOTE_TEXT[n.note]),
                    )}
                  >
                    {name(n)}
                    <sub className="ml-px text-[10px] opacity-70">{n.octave}</sub>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
