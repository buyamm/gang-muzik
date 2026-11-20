import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNote, type RangeSummary } from "@/lib/notation/range";
import {
  clampOctave,
  clampSemitones,
  formatKeyName,
  HORN_PRESETS,
  hasRangeCheck,
  hornPreset,
  SEMITONE_MAX,
  SEMITONE_MIN,
  suggestSaoKey,
  type HornPresetInfo,
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

/** preset groups shown in the panel, in order */
const PRESET_GROUPS: { family: HornPresetInfo["family"]; label: string }[] = [
  { family: "concert", label: "Concert" },
  { family: "sax", label: "Saxophone" },
  { family: "sao", label: "Sáo trúc 6 lỗ" },
];

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
  /** octave the auto mode picks for this song (sax / sáo presets) */
  autoOctaveValue?: number;
  /** written span of the song on the instrument (sax / sáo presets, songs with cảm âm notes) */
  rangeSummary?: RangeSummary | null;
  /** optional muted line shown at the top */
  notice?: string;
  /** song key (e.g. "Am"); used to suggest a matching sáo */
  songKey?: string;
  className?: string;
}

const formatSemitones = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : "−"}${Math.abs(n)}`);

/** transpose controls (instrument presets, custom interval, octave, spelling) */
export function TransposePanel({ value, onChange, autoOctaveValue, rangeSummary, notice, songKey, className }: TransposePanelProps) {
  const preset = value.preset ?? "custom";
  const ranged = hasRangeCheck(preset);
  const auto = ranged && !!value.autoOctave;
  const set = (patch: Partial<TransposeSetting>) => onChange({ ...value, ...patch });
  const pick = (p: HornPresetInfo) => set({ preset: p.id, semitones: p.semitones, autoOctave: hasRangeCheck(p.id) });
  const n = value.semitones;
  const saoHint = hornPreset(suggestSaoKey(songKey) ?? undefined);

  return (
    <div className={cn("space-y-4", className)}>
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
      {songKey && saoHint && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
          <span>
            Bài tone {formatKeyName(songKey)} → hợp <span className="font-semibold">{saoHint.name}</span>
          </span>
          {preset !== saoHint.id && (
            <button
              type="button"
              onClick={() => pick(saoHint)}
              className="shrink-0 rounded-md bg-primary px-2 py-0.5 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Dùng {saoHint.name}
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        <div>
          <div className="text-sm font-semibold">Nhạc cụ</div>
          <div className="text-xs text-muted-foreground">
            Dịch cảm âm & hợp âm sang giọng nhạc cụ của bạn — sax hoặc sáo, thổi đúng nốt đã viết. Sax và sáo tự chọn quãng tám
            vừa tầm.
          </div>
        </div>
        {PRESET_GROUPS.map((g) => (
          <div key={g.family} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{g.label}</div>
            <div className="flex flex-col gap-1">
              {HORN_PRESETS.filter((p) => p.family === g.family).map((p) => (
                <Choice key={p.id} active={preset === p.id} onClick={() => pick(p)}>
                  <span className="flex items-center justify-between gap-2">
                    <span>{p.label}</span>
                    <span className="text-xs opacity-75">{formatSemitones(p.semitones)}</span>
                  </span>
                </Choice>
              ))}
            </div>
          </div>
        ))}
        {rangeSummary && (
          <div
            className={cn(
              "rounded-md px-2 py-1.5 text-xs",
              rangeSummary.outOfRange ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            Tầm nốt trên {hornPreset(preset)?.name ?? "nhạc cụ"}: {formatNote(rangeSummary.low)} → {formatNote(rangeSummary.high)}
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
          <div className="text-xs text-muted-foreground">Trumpet, clarinet, sáo khác giọng… chọn số bán cung cần dịch.</div>
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
        {ranged && (
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
