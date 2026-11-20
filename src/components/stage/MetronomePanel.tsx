import { useEffect, useMemo, useRef, useState } from "react";
import { Hand, Metronome as MetronomeIcon, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDrone } from "@/hooks/useDrone";
import { useMetronome } from "@/hooks/useMetronome";
import {
  BPM_MAX,
  BPM_MIN,
  clampBpm,
  isAudioSupported,
  NOTE_NAMES,
  noteToFrequency,
  playClick,
  pushTap,
  tapTempo,
} from "@/lib/audio/engine";
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
 * `MetronomePanel` (thanh công cụ được vẽ 2 lần: header máy tính + footer điện thoại).
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

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
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
      className="h-9 w-16 rounded-md border bg-transparent text-center font-display text-lg font-bold tabular-nums [appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

/** the player's transposing instrument, to show the drone note as written for it */
export interface HornInfo {
  /** name inside a sentence, e.g. "kèn alto" */
  label: string;
  semitones: number;
  spelling: Spelling;
}

const ACCIDENTAL_GLYPH = { "#": "♯", b: "♭" } as const;

/** "Nhịp & drone" button + control popover */
export function MetronomePanel({
  audio,
  onOpenChange,
  horn,
  tonicPc,
}: {
  audio: StageAudio;
  onOpenChange?: (open: boolean) => void;
  /** transposing instrument in use (omit for concert) */
  horn?: HornInfo;
  /** tonic pitch class (0..11) of the song's stored key; shows a "song tonic" shortcut for the drone */
  tonicPc?: number;
}) {
  const { bpm, beatsPerBar, metro, drone, prefs, setAudio } = audio;
  const [taps, setTaps] = useState<number[]>([]);
  const tapped = taps.length >= 2;

  const onTap = () => {
    const next = pushTap(taps, performance.now());
    setTaps(next);
    const t = tapTempo(next);
    if (t !== null) audio.setBpm(t);
  };

  const label = audio.active ? "Nhịp & drone (đang phát)" : "Nhịp & drone";
  const droneNote = NOTE_NAMES[prefs.droneNote] ?? NOTE_NAMES[0];
  // the drone note as written for the player's horn (concert pc + semitones)
  const hornNote = horn && horn.semitones % 12 !== 0 ? semitoneToNote(prefs.droneNote + horn.semitones, horn.spelling) : null;

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
          className={cn("relative text-stage-fg hover:bg-stage-fg/10 hover:text-stage-fg", audio.active && "text-primary")}
        >
          <MetronomeIcon />
          {audio.active && (
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 right-1.5 size-2 rounded-full bg-primary transition-transform duration-75",
                metro.running && metro.beat === 0 && "scale-150",
              )}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        collisionPadding={8}
        className="max-h-[min(80vh,40rem)] w-80 space-y-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!audio.supported && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">Trình duyệt này không hỗ trợ phát âm thanh.</p>
        )}

        {/* ===== máy đếm nhịp ===== */}
        <section className="space-y-3" aria-label="Máy đếm nhịp">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Máy đếm nhịp</div>
              <div className="text-xs text-muted-foreground">Nhịp độ lưu riêng cho bài này</div>
            </div>
            <Switch checked={metro.running} onCheckedChange={(v) => (v ? metro.start() : metro.stop())} aria-label="Bật máy đếm nhịp" />
          </div>

          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Chậm hơn" title="Chậm hơn (−1)" onClick={() => audio.setBpm(bpm - 1)}>
              <Minus />
            </Button>
            <BpmInput bpm={bpm} onCommit={audio.setBpm} />
            <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Nhanh hơn" title="Nhanh hơn (+1)" onClick={() => audio.setBpm(bpm + 1)}>
              <Plus />
            </Button>
            <span className="text-xs text-muted-foreground">BPM</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={onTap}
              title="Gõ liên tục theo nhịp bài để đo BPM"
            >
              <Hand /> {tapped ? "Gõ tiếp" : "Gõ nhịp"}
            </Button>
          </div>

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

          <label className="flex items-center justify-between gap-2 text-sm">
            <span>
              Đếm vào
              <span className="block text-xs text-muted-foreground">Kêu “tách” mỗi giây lúc đếm ngược trước khi chạy</span>
            </span>
            <Switch checked={prefs.countIn} onCheckedChange={(v) => setAudio({ countIn: v })} />
          </label>
        </section>

        <div className="h-px bg-border" />

        {/* ===== drone ===== */}
        <section className="space-y-3" aria-label="Nốt nền">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Nốt nền (drone)</div>
              <div className="text-xs text-muted-foreground">
                Đang chọn: {droneNote.name} ({droneNote.letter}
                {prefs.droneOctave})
              </div>
            </div>
            <Switch checked={drone.running} onCheckedChange={(v) => (v ? drone.start() : drone.stop())} aria-label="Bật nốt nền" />
          </div>

          <div className="grid grid-cols-6 gap-1">
            {NOTE_NAMES.map((n) => (
              <button
                key={n.pc}
                type="button"
                aria-pressed={prefs.droneNote === n.pc}
                onClick={() => setAudio({ droneNote: n.pc })}
                className={cn(
                  "flex flex-col items-center rounded-md py-1 leading-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  prefs.droneNote === n.pc
                    ? "bg-primary text-primary-foreground"
                    : n.name.includes("#")
                      ? "bg-muted/60 text-muted-foreground hover:text-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70",
                )}
              >
                <span className="text-xs font-semibold">{n.name}</span>
                <span className="text-[10px] opacity-70">{n.letter}</span>
              </button>
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
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={prefs.droneNote === tonicPc}
              onClick={() => setAudio({ droneNote: tonicPc })}
            >
              Chủ âm của bài: {NOTE_NAMES[tonicPc].name} ({NOTE_NAMES[tonicPc].letter})
            </Button>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}

function VolumeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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
