import { Minus, Music2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatNote, type RangeSummary } from "@/lib/notation/range";
import {
  clampOctave,
  clampSemitones,
  HORN_PRESETS,
  hasRangeCheck,
  SEMITONE_MAX,
  SEMITONE_MIN,
  transposeBadge,
  type SpellingPref,
  type TransposeSetting,
} from "@/lib/notation/transpose";
import { cn } from "@/lib/utils";
import { Choice } from "./BookSettings";

const OCTAVES: { value: number; label: string }[] = [
  { value: -1, label: "Hạ 1" },
  { value: 0, label: "Giữ nguyên" },
  { value: 1, label: "Nâng 1" },
];

const octaveLabel = (n: number) => OCTAVES.find((o) => o.value === n)?.label ?? "Giữ nguyên";

const SPELLINGS: { value: SpellingPref; label: string }[] = [
  { value: "auto", label: "Tự động" },
  { value: "sharp", label: "♯ Thăng" },
  { value: "flat", label: "♭ Giáng" },
];

function Stepper({
  label,
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Giảm ${label}`} disabled={decDisabled} onClick={onDec}>
        <Minus />
      </Button>
      <div className="flex-1 text-center text-sm font-semibold tabular-nums">{value}</div>
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Tăng ${label}`} disabled={incDisabled} onClick={onInc}>
        <Plus />
      </Button>
    </div>
  );
}

export interface TransposePanelProps {
  value: TransposeSetting;
  onChange: (t: TransposeSetting) => void;
  /** octave the auto mode picks for this song (sax presets) */
  autoOctaveValue?: number;
  /** written span of the song on the horn (sax presets, songs with cảm âm notes) */
  rangeSummary?: RangeSummary | null;
  /** optional muted line shown at the top */
  notice?: string;
  className?: string;
}

const formatSemitones = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : "−"}${Math.abs(n)}`);

/** transpose controls (instrument presets, custom interval, octave, spelling) without a trigger */
export function TransposePanel({ value, onChange, autoOctaveValue, rangeSummary, notice, className }: TransposePanelProps) {
  const preset = value.preset ?? "custom";
  const sax = hasRangeCheck(preset);
  const auto = sax && !!value.autoOctave;
  const set = (patch: Partial<TransposeSetting>) => onChange({ ...value, ...patch });
  const n = value.semitones;

  return (
    <div className={cn("space-y-4", className)}>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
      <div className="space-y-2">
        <div>
          <div className="text-sm font-semibold">Loại kèn</div>
          <div className="text-xs text-muted-foreground">
            Dịch cảm âm và hợp âm sang giọng của kèn — thổi đúng nốt đã viết. Kèn sax tự chọn quãng tám vừa tầm kèn.
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {HORN_PRESETS.map((p) => (
            <Choice
              key={p.id}
              active={preset === p.id}
              onClick={() => set({ preset: p.id, semitones: p.semitones, autoOctave: p.sax })}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{p.label}</span>
                <span className="text-xs opacity-75">{formatSemitones(p.semitones)}</span>
              </span>
            </Choice>
          ))}
        </div>
        {rangeSummary && (
          <div
            className={cn(
              "rounded-md px-2 py-1.5 text-xs",
              rangeSummary.outOfRange ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            Tầm nốt trên kèn: {formatNote(rangeSummary.low)} → {formatNote(rangeSummary.high)}
            {rangeSummary.outOfRange ? (
              <span className="block font-medium">{rangeSummary.outOfRange} nốt ngoài tầm — đã gạch đỏ trong bài</span>
            ) : (
              " · vừa tầm"
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div>
          <div className="text-sm font-semibold">
            Nhạc cụ khác / tuỳ chỉnh{" "}
            {preset === "custom" && <span className="text-xs font-normal text-primary">(đang dùng)</span>}
          </div>
          <div className="text-xs text-muted-foreground">Trumpet, clarinet… chọn số bán cung cần dịch.</div>
        </div>
        <Stepper
          label="bán cung"
          value={n === 0 ? "0 bán cung" : `${n > 0 ? "+" : "−"}${Math.abs(n)} bán cung`}
          onDec={() => set({ preset: "custom", semitones: clampSemitones(n - 1) })}
          onInc={() => set({ preset: "custom", semitones: clampSemitones(n + 1) })}
          decDisabled={n <= SEMITONE_MIN}
          incDisabled={n >= SEMITONE_MAX}
        />
      </div>

      <div className="space-y-1.5">
        <div>
          <div className="text-sm font-semibold">Quãng tám (cảm âm)</div>
          <div className="text-xs text-muted-foreground">Nốt dịch lên cao quá / thấp quá thì hạ hoặc nâng cả bài một quãng tám.</div>
        </div>
        {sax && (
          <div className="flex">
            <Choice active={auto} onClick={() => set({ autoOctave: true })}>
              Tự động{autoOctaveValue !== undefined && ` (đang: ${octaveLabel(autoOctaveValue)})`}
            </Choice>
          </div>
        )}
        <div className="flex gap-1">
          {OCTAVES.map((o) => (
            <Choice
              key={o.value}
              active={!auto && value.octave === o.value}
              onClick={() => set({ octave: clampOctave(o.value), autoOctave: false })}
            >
              {o.label}
            </Choice>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <div className="text-sm font-semibold">Kiểu dấu</div>
          <div className="text-xs text-muted-foreground">Tự động: giọng giáng (F, Bb, Eb, Ab, Db) dùng ♭, còn lại dùng ♯.</div>
        </div>
        <div className="flex gap-1">
          {SPELLINGS.map((s) => (
            <Choice key={s.value} active={value.spelling === s.value} onClick={() => set({ spelling: s.value })}>
              {s.label}
            </Choice>
          ))}
        </div>
      </div>
    </div>
  );
}

/** pick the instrument (sax type, or a custom interval) to transpose cảm âm & chords */
export function TransposeSettings({
  onOpenChange,
  ...panel
}: Omit<TransposePanelProps, "className"> & {
  onOpenChange?: (open: boolean) => void;
}) {
  const badge = transposeBadge(panel.value);
  const label = badge ? `Giọng kèn (đang dịch: ${badge})` : "Giọng kèn";

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          onClick={(e) => e.stopPropagation()}
          className={cn("relative text-stage-fg hover:bg-stage-fg/10 hover:text-stage-fg", badge && "text-primary")}
        >
          <Music2 />
          {badge && (
            <span className="pointer-events-none absolute -top-0.5 -right-1 rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="max-h-[min(80vh,40rem)] w-80 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <TransposePanel {...panel} />
      </PopoverContent>
    </Popover>
  );
}
