import { useState } from "react";
import { Hand, Minus, Plus } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "@astryxdesign/core/Icon";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { BPM_MAX, BPM_MIN, pushTap, tapTempo } from "@/lib/audio/engine";
import { HORN_PRESETS, hasRangeCheck, type HornPreset, type HornPresetInfo, type SpellingPref, type TransposeSetting } from "@/lib/notation/transpose";
import { selectPreset } from "@/lib/practice/instrument";
import { keyName, noteText, scaleDef, type ScaleType } from "@/lib/practice/scales";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <VStack gap={2}>
      <VStack gap={0.5}>
        <Text type="label" weight="semibold">
          {label}
        </Text>
        {hint && <Text type="supporting" color="secondary">{hint}</Text>}
      </VStack>
      {children}
    </VStack>
  );
}

/**
 * Single choice. Short option lists render as an Astryx SegmentedControl;
 * pass `className` with a grid (e.g. "grid grid-cols-4") for long lists, which renders pressed ToggleButtons in that grid.
 */
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
  const byKey = (k: string) => options.find((o) => String(o.value) === k)?.value;
  const text = (o: (typeof options)[number]) => (typeof o.label === "string" ? o.label : (o.title ?? String(o.value)));
  if (className)
    return (
      <div role="group" aria-label={label} className={cn("gap-1", className)}>
        {options.map((o) => (
          <ToggleButton
            key={String(o.value)}
            label={text(o)}
            tooltip={o.title}
            isPressed={value === o.value}
            onPressedChange={() => onChange(o.value)}
            className="w-full"
          >
            {o.label}
          </ToggleButton>
        ))}
      </div>
    );
  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <SegmentedControl
        label={label}
        layout="fill"
        value={String(value)}
        onChange={(k) => {
          const v = byKey(k);
          if (v !== undefined) onChange(v);
        }}
      >
        {options.map((o) => (
          <SegmentedControlItem key={String(o.value)} value={String(o.value)} label={text(o)} />
        ))}
      </SegmentedControl>
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
    <Switch label={label} description={hint} value={checked} onChange={(v) => onChange(v)} labelPosition="start" labelSpacing="spread" width="100%" />
  );
}

export function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Slider
      label={label}
      min={0}
      max={1}
      step={0.05}
      value={value}
      onChange={(v: number) => onChange(v)}
      formatValue={(v) => `${Math.round(v * 100)}%`}
      valueDisplay="text"
      width="100%"
    />
  );
}

/** preset groups of the picker, in order (same grouping as the Stage settings drawer) */
const PRESET_GROUPS: { family: HornPresetInfo["family"]; label: string }[] = [
  { family: "concert", label: "Concert" },
  { family: "sax", label: "Saxophone" },
  { family: "sao", label: "Sáo trúc 6 lỗ" },
];

/**
 * Instrument picker: `HORN_PRESETS` grouped by family (+ the custom shift set on a song page, when in use),
 * then the octave (concert / custom only: sax and sáo play at the instrument's real pitch) and the spelling.
 */
export function InstrumentPicker({ value, onChange }: { value: TransposeSetting; onChange: (t: TransposeSetting) => void }) {
  const preset: HornPreset = value.preset ?? "custom";
  const groups = PRESET_GROUPS.map((g) => {
    const options: { value: HornPreset; label: string; title?: string }[] = HORN_PRESETS.filter((p) => p.family === g.family).map(
      (p) => ({ value: p.id, label: p.family === "sao" ? p.label.replace(/^Sáo /, "") : p.label }),
    );
    if (g.family === "concert" && preset === "custom")
      options.push({ value: "custom", label: `Tuỳ chỉnh ${value.semitones > 0 ? "+" : ""}${value.semitones}`, title: "Đặt ở trang bài" });
    return { ...g, options };
  });
  return (
    <div className="space-y-3">
      <Field label="Nhạc cụ" hint="Nốt hiện theo giọng viết của nhạc cụ; tiếng phát ra là cao độ thật (concert).">
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.family} className="space-y-1">
              <Text type="supporting" color="secondary" weight="medium" display="block">
                {g.label}
              </Text>
              <Segmented
                label={g.label}
                value={preset}
                options={g.options}
                onChange={(id) => onChange(selectPreset(value, id))}
                className={g.family === "sao" ? "grid grid-cols-4 @lg:grid-cols-7" : "grid grid-cols-2 @lg:grid-cols-4"}
              />
            </div>
          ))}
        </div>
      </Field>
      {!hasRangeCheck(preset) && (
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
    <div role="group" aria-label="Chủ âm" className="grid grid-cols-4 gap-1 @lg:grid-cols-6">
      {Array.from({ length: 12 }, (_, pc) => {
        const written = keyName(pc, minor, transpose.spelling);
        const concert = keyName(pc - transpose.semitones, minor, transpose.spelling);
        const active = value === pc;
        return (
          <ToggleButton
            key={pc}
            size="lg"
            label={shifted ? `Viết ${noteText(written)} = concert ${noteText(concert)}` : noteText(written)}
            isPressed={active}
            onPressedChange={() => onChange(pc)}
            className={cn("w-full", shifted && "h-auto! py-1.5")}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-base font-bold">{noteText(written)}</span>
              {shifted && <span className="text-[11px] opacity-75">concert {noteText(concert)}</span>}
            </span>
          </ToggleButton>
        );
      })}
    </div>
  );
}

function BpmInput({ bpm, onCommit }: { bpm: number; onCommit: (v: number) => void }) {
  return (
    <div className="w-20">
      <NumberInput
        label="Nhịp độ (BPM)"
        isLabelHidden
        size="lg"
        min={BPM_MIN}
        max={BPM_MAX}
        isIntegerOnly
        value={bpm}
        onChange={onCommit}
        entryErrorBehavior="blur-or-enter"
      />
    </div>
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
      <IconButton size="lg" label="Chậm hơn" tooltip="Chậm hơn (Shift: −5)" icon={<Icon icon={Minus} />} onClick={(e) => onChange(bpm - (e.shiftKey ? 5 : 1))} />
      <BpmInput bpm={bpm} onCommit={onChange} />
      <IconButton size="lg" label="Nhanh hơn" tooltip="Nhanh hơn (Shift: +5)" icon={<Icon icon={Plus} />} onClick={(e) => onChange(bpm + (e.shiftKey ? 5 : 1))} />
      <Text type="supporting" color="secondary">
        BPM
      </Text>
      <span className="ml-auto">
        <Button size="lg" label={taps.length >= 2 ? "Gõ tiếp" : "Gõ nhịp"} tooltip="Gõ liên tục theo nhịp để đo BPM" icon={<Icon icon={Hand} />} onClick={onTap} />
      </span>
    </div>
  );
}
