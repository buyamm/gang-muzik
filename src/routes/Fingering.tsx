import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Link2, TriangleAlert, Volume2, Wind } from "lucide-react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { AppFrame } from "@/components/AppFrame";
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
  { id: "sao", label: "Sáo trúc", hint: "sáo 6 lỗ, Đô1 – Đô3" },
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

  const showToast = useToast();
  const copyLink = async () => {
    const url = `${location.origin}/fingering${fingeringSearch(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ body: "Đã sao chép liên kết", uniqueID: "copy-link" });
    } catch {
      showToast({ body: url, isAutoHide: false });
    }
  };

  const controls = (
    <VStack gap={6}>
      <VStack gap={2}>
        <Text type="label" weight="semibold">
          Nhạc cụ
        </Text>
        <SegmentedControl label="Nhạc cụ" layout="fill" value={instrument} onChange={(v) => go({ instrument: v as LearnInstrument })}>
          {INSTRUMENTS.map((i) => (
            <SegmentedControlItem key={i.id} value={i.id} label={i.label} />
          ))}
        </SegmentedControl>
        <Text type="supporting" color="secondary">
          Tầm nốt: {INSTRUMENTS.find((i) => i.id === instrument)?.hint}
        </Text>
      </VStack>
      <Selector
        label={instrument === "sax" ? "Loại kèn" : "Cây sáo"}
        description={
          instrument === "sax"
            ? "Thế bấm giống nhau cho mọi loại kèn; loại kèn chỉ đổi âm thanh thật."
            : "Thế bấm giống nhau cho mọi cây sáo 6 lỗ. Bịt kín 6 lỗ là nốt Đô của sáo."
        }
        options={types.map((t) => ({ value: t.id, label: instrument === "sax" ? `${t.label} (${t.key})` : t.label }))}
        value={typeInfo.id}
        onChange={(v) => v && go({ type: v })}
      />
      <NotePicker instrument={instrument} value={semi} onChange={(s) => go({ semi: s })} />
    </VStack>
  );

  return (
    <AppFrame>
      <Layout
        height="auto"
        start={
          <div className="hidden md:block">
            <LayoutPanel hasDivider padding={6} width={340} label="Chọn nhạc cụ và nốt">
              {controls}
            </LayoutPanel>
          </div>
        }
        content={
          <LayoutContent padding={8} role="main">
            <VStack gap={8}>
              <VStack gap={2}>
                <Heading level={1}>Tra thế bấm</Heading>
                <Text color="secondary">
                  Cách bấm chuẩn và mọi cách bấm phụ của từng nốt, kèm lúc nào nên dùng. Nốt viết theo cảm âm của nhạc cụ (đọc thẳng trên bản
                  nhạc đã dịch giọng).
                </Text>
              </VStack>

              {/* phones: the controls panel sits above the result */}
              <div className="md:hidden">
                <Card padding={4}>{controls}</Card>
              </div>

              <section aria-live="polite">
                <VStack gap={6}>
                  <HStack gap={6} vAlign="end" wrap="wrap">
                    <StackItem size="fill">
                      <VStack gap={1}>
                        <Text type="supporting" color="secondary">
                          {instrument === "sax" ? `Saxophone ${typeInfo.label}` : `Sáo trúc · ${typeInfo.label}`}
                        </Text>
                        <span className={cn("font-display text-6xl leading-none font-bold", NOTE_TEXT[written.note])}>{fmt(written)}</span>
                        <Text color="secondary">
                          Âm thanh thật: <b className="text-foreground">{concertLabel(concertAbs)}</b>
                        </Text>
                      </VStack>
                    </StackItem>
                    <HStack gap={2} wrap="wrap">
                      <Button
                        variant="primary"
                        label="Nghe âm mẫu"
                        icon={<Icon icon={Volume2} />}
                        onClick={() => playTone(concertFrequency(instrument, typeInfo.id, semi), 1.4)}
                      />
                      <Button label="Sao chép liên kết" icon={<Icon icon={Link2} />} onClick={copyLink} />
                    </HStack>
                  </HStack>

                  {note && <Banner status="warning" title={note} icon={<Icon icon={TriangleAlert} />} />}

                  <Divider />

                  {cards.length > 0 && (
                    <VStack gap={4}>
                      <Heading level={2}>Cách bấm chuẩn</Heading>
                      <OptionView card={cards[0]} noteName={fmt(written)} hero />
                    </VStack>
                  )}
                  {cards.length > 1 && (
                    <VStack gap={4}>
                      <HStack gap={2} vAlign="center">
                        <Heading level={2}>Cách bấm phụ</Heading>
                        <Badge label={cards.length - 1} />
                      </HStack>
                      <Text color="secondary">Chọn theo nốt đứng trước và sau trong câu nhạc.</Text>
                      <Grid columns={{ minWidth: 260, max: 3 }} gap={4}>
                        {cards.slice(1).map((c) => (
                          <OptionView key={c.label} card={c} noteName={fmt(written)} />
                        ))}
                      </Grid>
                    </VStack>
                  )}
                </VStack>
              </section>
            </VStack>
          </LayoutContent>
        }
      />
    </AppFrame>
  );
}

function OptionView({ card, noteName, hero = false }: { card: OptionCard; noteName: string; hero?: boolean }) {
  return (
    <Card padding={hero ? 6 : 4} height="100%">
    <article className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        {!hero && <Heading level={3}>{card.label}</Heading>}
        {card.sao?.uncertain && (
          <span title="Chưa đối chiếu đủ nguồn — nên kiểm tra bằng máy lên dây">
            <Badge variant="warning" label="Tham khảo" />
          </span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg bg-muted px-2 py-4 text-foreground">
        {card.sax && (
          <SaxFingeringDiagram keys={card.sax} height={hero ? 340 : 260} accent label={`${noteName}, ${card.label}. ${describeFingering(card.sax)}`} />
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
    </Card>
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
      <Text type="label" weight="semibold" display="block">
        <span className="mb-1.5 block">Nốt</span>
      </Text>
      <div className="space-y-2" role="radiogroup" aria-label="Chọn nốt">
        {rows.map(([octave, notes]) => (
          <div key={octave} className="flex items-center gap-2">
            <span className="w-14 shrink-0 self-start pt-2 text-xs text-muted-foreground">Quãng {octave}</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1 py-0.5">
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
                          ? "border-dashed border-border bg-muted text-muted-foreground hover:text-foreground"
                          : cn("border-border bg-background hover:bg-accent", NOTE_TEXT[n.note]),
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
