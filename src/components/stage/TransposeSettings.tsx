import { Minus, Music2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  clampOctave,
  clampSemitones,
  presetOf,
  SEMITONE_MAX,
  SEMITONE_MIN,
  transposeBadge,
  TRANSPOSE_PRESETS,
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

/** chọn giọng nhạc cụ (Bb, Eb, tuỳ chỉnh) để dịch cảm âm & hợp âm */
export function TransposeSettings({
  value,
  onChange,
  onOpenChange,
}: {
  value: TransposeSetting;
  onChange: (t: TransposeSetting) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const badge = transposeBadge(value);
  const preset = presetOf(value.semitones);
  const set = (patch: Partial<TransposeSetting>) => onChange({ ...value, ...patch });
  const n = value.semitones;
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
      <PopoverContent align="end" className="w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold">Giọng kèn</div>
            <div className="text-xs text-muted-foreground">
              Dịch cảm âm và hợp âm sang giọng của nhạc cụ — saxophone, trumpet, clarinet… thổi đúng nốt đã viết.
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {TRANSPOSE_PRESETS.map((p) => (
              <Choice key={p.id} active={preset === p.id} onClick={() => set({ semitones: p.semitones })}>
                <span className="flex items-center justify-between gap-2">
                  <span>{p.label}</span>
                  <span className="text-xs opacity-75">{p.semitones ? `+${p.semitones}` : "0"}</span>
                </span>
              </Choice>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-sm font-semibold">Tuỳ chỉnh {preset === null && <span className="text-xs font-normal text-primary">(đang dùng)</span>}</div>
          <Stepper
            label="bán cung"
            value={n === 0 ? "0 bán cung" : `${n > 0 ? "+" : "−"}${Math.abs(n)} bán cung`}
            onDec={() => set({ semitones: clampSemitones(n - 1) })}
            onInc={() => set({ semitones: clampSemitones(n + 1) })}
            decDisabled={n <= SEMITONE_MIN}
            incDisabled={n >= SEMITONE_MAX}
          />
        </div>

        <div className="space-y-1.5">
          <div>
            <div className="text-sm font-semibold">Quãng tám (cảm âm)</div>
            <div className="text-xs text-muted-foreground">Nốt dịch lên cao quá / thấp quá thì hạ hoặc nâng cả bài một quãng tám.</div>
          </div>
          <div className="flex gap-1">
            {OCTAVES.map((o) => (
              <Choice key={o.value} active={value.octave === o.value} onClick={() => set({ octave: clampOctave(o.value) })}>
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
      </PopoverContent>
    </Popover>
  );
}
