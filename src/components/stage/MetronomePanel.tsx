import { useEffect, useMemo, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { BpmControl, ToggleRow, VolumeRow } from "@/components/practice/PracticeControls";
import { Choice } from "./BookSettings";
import { useDrone } from "@/hooks/useDrone";
import { useMetronome } from "@/hooks/useMetronome";
import { clampBpm, isAudioSupported, NOTE_NAMES, noteToFrequency, playClick } from "@/lib/audio/engine";
import { semitoneToNote, type Spelling } from "@/lib/notation/transpose";
import { readPref, writePref } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export const DEFAULT_BPM = 80;
export const BEAT_OPTIONS = [2, 3, 4, 6] as const;
const OCTAVES = [2, 3, 4, 5] as const;

/** cài đặt âm thanh chung cho mọi bài (không theo bài) */
export interface AudioPrefs {
  metroVolume: number;
  droneVolume: number;
  /** 0 = Đô … 11 = Si */
  droneNote: number;
  droneOctave: number;
  /** tiếng click mỗi giây trong lúc đếm ngược */
  countIn: boolean;
}

const AUDIO_KEY = "gm:audio";
const AUDIO_DEFAULTS: AudioPrefs = { metroVolume: 0.8, droneVolume: 0.5, droneNote: 0, droneOctave: 3, countIn: true };

/** read / write the shared audio prefs (`gm:audio`); the practice page shares these volumes */
export const loadAudioPrefs = () => readPref(AUDIO_KEY, AUDIO_DEFAULTS);
export const saveAudioPrefs = (p: AudioPrefs) => writePref(AUDIO_KEY, p);

/**
 * Toàn bộ trạng thái nhịp & drone của Stage. Gọi MỘT lần trong Stage rồi truyền xuống
 * `MetronomePanel` / `MetronomeControls`.
 */
export function useStageAudio({
  bpm,
  beatsPerBar,
  onChange,
  countdown,
}: {
  bpm: number;
  beatsPerBar: number;
  /** ghi BPM / số phách vào cài đặt riêng của bài */
  onChange: (patch: { bpm?: number; beatsPerBar?: number }) => void;
  /** giá trị đếm ngược hiện tại của Stage (null = không đếm) — để phát tiếng đếm vào */
  countdown: number | null;
}) {
  const [prefs, setPrefs] = useState<AudioPrefs>(loadAudioPrefs);
  const setAudio = (patch: Partial<AudioPrefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      saveAudioPrefs(next);
      return next;
    });

  const metro = useMetronome({ bpm, beatsPerBar, volume: prefs.metroVolume });
  const frequency = useMemo(() => noteToFrequency(prefs.droneNote, prefs.droneOctave), [prefs.droneNote, prefs.droneOctave]);
  const drone = useDrone({ frequency, volume: prefs.droneVolume });

  // đếm vào: mỗi giây đếm ngược một tiếng click (khi metronome chưa chạy)
  const countInRef = useRef({ on: prefs.countIn, running: metro.running, vol: prefs.metroVolume });
  countInRef.current = { on: prefs.countIn, running: metro.running, vol: prefs.metroVolume };
  useEffect(() => {
    const c = countInRef.current;
    if (countdown === null || countdown <= 0 || !c.on || c.running) return;
    playClick(countdown === 1, c.vol);
  }, [countdown]);

  return {
    supported: isAudioSupported(),
    bpm,
    beatsPerBar,
    setBpm: (v: number) => onChange({ bpm: clampBpm(v) }),
    setBeatsPerBar: (n: number) => onChange({ beatsPerBar: n }),
    prefs,
    setAudio,
    metro,
    drone,
    active: metro.running || drone.running,
  };
}

export type StageAudio = ReturnType<typeof useStageAudio>;

/** the player's transposing instrument, to show the drone note as written for it */
export interface HornInfo {
  /** name inside a sentence, e.g. "kèn alto" */
  label: string;
  semitones: number;
  spelling: Spelling;
}

const ACCIDENTAL_GLYPH = { "#": "♯", b: "♭" } as const;

export interface MetronomeControlsProps {
  audio: StageAudio;
  /** transposing instrument in use (omit for concert) */
  horn?: HornInfo;
  /** tonic pitch class (0..11) of the song's stored key; shows a "song tonic" shortcut for the drone */
  tonicPc?: number;
  className?: string;
}

/** metronome + drone controls without a trigger (popover body, settings drawer) */
export function MetronomeControls({ audio, horn, tonicPc, className }: MetronomeControlsProps) {
  const { bpm, beatsPerBar, metro, drone, prefs, setAudio } = audio;

  const droneNote = NOTE_NAMES[prefs.droneNote] ?? NOTE_NAMES[0];
  // the drone note as written for the player's horn (concert pc + semitones)
  const hornNote = horn && horn.semitones % 12 !== 0 ? semitoneToNote(prefs.droneNote + horn.semitones, horn.spelling) : null;

  return (
    <div className={cn("space-y-5", className)}>
      {!audio.supported && <Banner status="error" title="Trình duyệt này không hỗ trợ phát âm thanh." />}

      {/* ===== máy đếm nhịp ===== */}
      <section className="space-y-3" aria-label="Máy đếm nhịp">
        <ToggleRow
          label="Máy đếm nhịp"
          hint="Nhịp độ lưu riêng cho bài này"
          checked={metro.running}
          onChange={(v) => (v ? metro.start() : metro.stop())}
        />

        <BpmControl bpm={bpm} onChange={audio.setBpm} />

        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Số phách mỗi ô nhịp</div>
          <div className="flex gap-1">
            {BEAT_OPTIONS.map((n) => (
              <Choice key={n} active={beatsPerBar === n} onClick={() => audio.setBeatsPerBar(n)}>
                {n}
              </Choice>
            ))}
          </div>
        </div>

        {/* đèn phách */}
        <div className="flex items-center justify-center gap-2 py-1" aria-hidden>
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <span
              key={i}
              className={cn(
                "rounded-full transition-all duration-75",
                i === 0 ? "size-3.5" : "size-2.5",
                metro.beat === i ? (i === 0 ? "scale-125 bg-primary" : "scale-125 bg-foreground") : "bg-muted-foreground/25",
              )}
            />
          ))}
        </div>

        <VolumeRow label="Âm lượng tiếng nhịp" value={prefs.metroVolume} onChange={(v) => setAudio({ metroVolume: v })} />

        <ToggleRow
          label="Đếm vào"
          hint="Kêu “tách” mỗi giây lúc đếm ngược trước khi chạy"
          checked={prefs.countIn}
          onChange={(v) => setAudio({ countIn: v })}
        />
      </section>

      <Divider />

      {/* ===== drone ===== */}
      <section className="space-y-3" aria-label="Nốt nền">
        <ToggleRow
          label="Nốt nền (drone)"
          hint={`Đang chọn: ${droneNote.name} (${droneNote.letter}${prefs.droneOctave})`}
          checked={drone.running}
          onChange={(v) => (v ? drone.start() : drone.stop())}
        />

        <div className="grid grid-cols-6 gap-1">
          {NOTE_NAMES.map((n) => (
            <ToggleButton
              key={n.pc}
              size="lg"
              label={`${n.name} (${n.letter})`}
              isPressed={prefs.droneNote === n.pc}
              onPressedChange={() => setAudio({ droneNote: n.pc })}
              className="w-full min-w-0 px-0!"
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="text-xs font-semibold">{n.name}</span>
                <span className="text-[10px] opacity-70">{n.letter}</span>
              </span>
            </ToggleButton>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Quãng tám</div>
          <div className="flex gap-1">
            {OCTAVES.map((o) => (
              <Choice key={o} active={prefs.droneOctave === o} onClick={() => setAudio({ droneOctave: o })}>
                {o === 2 ? `Trầm ${o}` : o === 5 ? `Cao ${o}` : o}
              </Choice>
            ))}
          </div>
        </div>

        <VolumeRow label="Âm lượng nốt nền" value={prefs.droneVolume} onChange={(v) => setAudio({ droneVolume: v })} />

        {horn && hornNote && (
          <p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
            Trên {horn.label}:{" "}
            <span className="font-semibold text-foreground">
              {hornNote.note}
              {hornNote.accidental && ACCIDENTAL_GLYPH[hornNote.accidental]}
            </span>
          </p>
        )}
        {tonicPc !== undefined && NOTE_NAMES[tonicPc] && (
          <Button
            size="sm"
            width="100%"
            label={`Chủ âm của bài: ${NOTE_NAMES[tonicPc].name} (${NOTE_NAMES[tonicPc].letter})`}
            isDisabled={prefs.droneNote === tonicPc}
            onClick={() => setAudio({ droneNote: tonicPc })}
          />
        )}
      </section>
    </div>
  );
}
