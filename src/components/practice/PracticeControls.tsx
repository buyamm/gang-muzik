import { useEffect, useState } from "react";
import { Hand, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BPM_MAX, BPM_MIN, pushTap, tapTempo } from "@/lib/audio/engine";
import { HORN_PRESETS, isSaxPreset, type HornPreset, type SpellingPref, type TransposeSetting } from "@/lib/notation/transpose";
import { selectPreset } from "@/lib/practice/instrument";
import { keyName, noteText, scaleDef, type ScaleType } from "@/lib/practice/scales";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** single-choice button group (aria-pressed) */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.title}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 flex-1 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value === o.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <Slider min={0} max={1} step={0.05} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}

/**
 * Horn picker: every `HORN_PRESETS` entry (+ the custom shift set on a song page, when in use), then the
 * octave (concert / custom only: sax presets play at the horn's real pitch) and the spelling.
 */
export function InstrumentPicker({ value, onChange }: { value: TransposeSetting; onChange: (t: TransposeSetting) => void }) {
  const preset: HornPreset = value.preset ?? "custom";
  const options: { value: HornPreset; label: string; title?: string }[] = HORN_PRESETS.map((p) => ({ value: p.id, label: p.label }));
  if (preset === "custom")
    options.push({ value: "custom", label: `Tuỳ chỉnh ${value.semitones > 0 ? "+" : ""}${value.semitones}`, title: "Đặt ở trang bài" });
  return (
    <div className="space-y-3">
      <Field label="Giọng kèn" hint="Nốt hiện theo giọng viết của nhạc cụ; tiếng phát ra là cao độ thật (concert).">
        <Segmented
          label="Giọng kèn"
          value={preset}
          options={options}
          onChange={(id) => onChange(selectPreset(value, id))}
          className="grid grid-cols-2 sm:grid-cols-3"
        />
      </Field>
      {!isSaxPreset(preset) && (
        <Field label="Quãng tám của kèn" hint="Nhạc cụ kêu thấp hơn nốt viết 1 quãng tám: chọn “Thấp hơn 1”.">
          <Segmented
            label="Quãng tám của kèn"
            value={value.octave}
            options={[
              { value: -1, label: "Cao hơn 1" },
              { value: 0, label: "Giữ nguyên" },
              { value: 1, label: "Thấp hơn 1" },
            ]}
            onChange={(v) => onChange({ ...value, octave: v, autoOctave: false })}
          />
        </Field>
      )}
      <Field label="Kiểu dấu">
        <Segmented<SpellingPref>
          label="Kiểu dấu"
          value={value.spelling}
          options={[
            { value: "auto", label: "Theo giọng" },
            { value: "sharp", label: "♯ Thăng" },
            { value: "flat", label: "♭ Giáng" },
          ]}
          onChange={(v) => onChange({ ...value, spelling: v })}
        />
      </Field>
    </div>
  );
}

/** the 12 tonics in the written key, with the concert name when the horn transposes */
export function TonicPicker({
  value,
  type,
  transpose,
  onChange,
}: {
  value: number;
  type: ScaleType;
  transpose: TransposeSetting;
  onChange: (pc: number) => void;
}) {
  const minor = scaleDef(type).minor;
  const shifted = transpose.semitones !== 0;
  return (
    <div role="group" aria-label="Chủ âm" className="grid grid-cols-4 gap-1 sm:grid-cols-6">
      {Array.from({ length: 12 }, (_, pc) => {
        const written = keyName(pc, minor, transpose.spelling);
        const concert = keyName(pc - transpose.semitones, minor, transpose.spelling);
        const active = value === pc;
        return (
          <button
            key={pc}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(pc)}
            title={shifted ? `Viết ${noteText(written)} = concert ${noteText(concert)}` : noteText(written)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center rounded-md px-1 py-1 leading-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70",
            )}
          >
            <span className="text-base font-bold">{noteText(written)}</span>
            {shifted && <span className="text-[11px] opacity-75">concert {noteText(concert)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function BpmInput({ bpm, onCommit }: { bpm: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(bpm));
  useEffect(() => setText(String(bpm)), [bpm]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && text.trim()) onCommit(n);
    else setText(String(bpm));
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={BPM_MIN}
      max={BPM_MAX}
      value={text}
      aria-label="Nhịp độ (BPM)"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className="h-10 w-16 rounded-md border bg-transparent text-center font-display text-xl font-bold tabular-nums [appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

/** BPM: −/+ (Shift = ±5), number input, tap tempo */
export function BpmControl({ bpm, onChange }: { bpm: number; onChange: (v: number) => void }) {
  const [taps, setTaps] = useState<number[]>([]);
  const onTap = () => {
    const next = pushTap(taps, performance.now());
    setTaps(next);
    const t = tapTempo(next);
    if (t !== null) onChange(t);
  };
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Chậm hơn" title="Chậm hơn (Shift: −5)" onClick={(e) => onChange(bpm - (e.shiftKey ? 5 : 1))}>
        <Minus />
      </Button>
      <BpmInput bpm={bpm} onCommit={onChange} />
      <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Nhanh hơn" title="Nhanh hơn (Shift: +5)" onClick={(e) => onChange(bpm + (e.shiftKey ? 5 : 1))}>
        <Plus />
      </Button>
      <span className="text-xs text-muted-foreground">BPM</span>
      <Button type="button" variant="secondary" size="sm" className="ml-auto h-10 gap-1.5" onClick={onTap} title="Gõ liên tục theo nhịp để đo BPM">
        <Hand /> {taps.length >= 2 ? "Gõ tiếp" : "Gõ nhịp"}
      </Button>
    </div>
  );
}
