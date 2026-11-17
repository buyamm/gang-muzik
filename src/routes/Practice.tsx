import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LongToneDisplay } from "@/components/practice/LongToneDisplay";
import { NoteChips } from "@/components/practice/NoteChips";
import {
  BpmControl,
  Field,
  InstrumentPicker,
  Segmented,
  TonicPicker,
  ToggleRow,
  VolumeRow,
} from "@/components/practice/PracticeControls";
import { loadAudioPrefs, saveAudioPrefs, type AudioPrefs } from "@/components/stage/MetronomePanel";
import { useDrone } from "@/hooks/useDrone";
import { loadKeyMap, usePedalKeys, type KeyMap } from "@/hooks/usePedalKeys";
import { BEATS_PER_BAR, usePracticeRunner } from "@/hooks/usePracticeRunner";
import { useWakeLock } from "@/hooks/useWakeLock";
import { clampBpm, isAudioSupported, playTone } from "@/lib/audio/engine";
import { normalizeTranspose, NO_TRANSPOSE, type TransposeSetting } from "@/lib/notation/transpose";
import {
  concertKeyName,
  droneFrequency,
  EXERCISES,
  keyName,
  letterText,
  longToneSequence,
  noteText,
  PATTERNS,
  practiceSequence,
  SCALE_TYPES,
  scaleDef,
  scaleTitle,
} from "@/lib/practice/scales";
import {
  HOLD_OPTIONS,
  normalizePractice,
  PRACTICE_DEFAULTS,
  PRACTICE_KEY,
  REST_OPTIONS,
  type PracticeSettings,
} from "@/lib/practice/settings";
import { readPref, writePref } from "@/lib/prefs";
import { useSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { PRACTICE_SEO } from "@shared/seo";

/** giọng kèn chọn gần nhất — dùng chung với trang bài */
const TRANSPOSE_KEY = "gm:transpose";

/** sơ đồ pedal của Stage, luôn có thêm Space để bắt đầu / dừng */
function practiceKeyMap(): KeyMap {
  const m = loadKeyMap();
  return { ...m, toggle: m.toggle.includes(" ") ? m.toggle : [...m.toggle, " "] };
}

export function Practice() {
  useSeo(PRACTICE_SEO);
  const [s, setS] = useState<PracticeSettings>(() => normalizePractice(readPref(PRACTICE_KEY, PRACTICE_DEFAULTS)));
  const set = useCallback((patch: Partial<PracticeSettings>) => {
    setS((p) => {
      const next = { ...p, ...patch };
      writePref(PRACTICE_KEY, next);
      return next;
    });
  }, []);

  const [transpose, setTransposeState] = useState<TransposeSetting>(() =>
    normalizeTranspose(readPref<Partial<TransposeSetting>>(TRANSPOSE_KEY, NO_TRANSPOSE)),
  );
  const setTranspose = (t: TransposeSetting) => {
    const n = normalizeTranspose(t);
    setTransposeState(n);
    writePref(TRANSPOSE_KEY, n);
  };

  const [audio, setAudioState] = useState<AudioPrefs>(loadAudioPrefs);
  const setAudio = (patch: Partial<AudioPrefs>) =>
    setAudioState((p) => {
      const next = { ...p, ...patch };
      saveAudioPrefs(next);
      return next;
    });

  const scaleOpts = {
    tonic: s.tonic,
    type: s.type,
    exercise: s.exercise,
    octaves: s.octaves,
    pattern: s.pattern,
    transpose,
    octaveShift: s.octaveShift,
  };
  const optsKey = JSON.stringify([scaleOpts, s.mode]);
  // dãy nốt chỉ tính lại khi cài đặt đổi thật (scaleOpts là object mới mỗi lần render)
  const seq = useMemo(() => (s.mode === "longtone" ? longToneSequence(scaleOpts) : practiceSequence(scaleOpts)), [optsKey]);

  const runner = usePracticeRunner({
    mode: s.mode,
    seq,
    bpm: s.bpm,
    notesPerBeat: s.notesPerBeat,
    countIn: s.countIn,
    refTone: s.refTone,
    hold: s.hold,
    rest: s.rest,
    metroVolume: audio.metroVolume,
    toneVolume: s.toneVolume,
  });

  const drone = useDrone({ frequency: droneFrequency(seq[0]?.concert ?? 0), volume: audio.droneVolume });
  const wantDrone = s.drone && runner.running;
  useSyncDrone(wantDrone, drone);
  useWakeLock(runner.running);

  const toggle = () => {
    if (runner.running) {
      runner.stop();
      drone.stop();
    } else runner.start();
  };

  const keymap = useMemo(practiceKeyMap, []);
  usePedalKeys(
    (a) => {
      if (a === "toggle") toggle();
      else set({ tonic: (s.tonic + (a === "next" ? 1 : 11)) % 12 });
    },
    keymap,
  );

  const def = scaleDef(s.type);
  const written = keyName(s.tonic, def.minor, transpose.spelling);
  const concert = concertKeyName(s.tonic, s.type, transpose);
  const title = scaleTitle(written, s.type, s.exercise);
  const step = runner.step;
  const activeIndex = step && step.phase !== "countin" ? step.index : null;

  const preview = (i: number) => {
    if (runner.running) return;
    const n = seq[i];
    if (n) playTone(n.frequency, 0.8, s.toneVolume);
  };

  return (
    <div className="min-h-full pb-28 sm:pb-12">
      <header className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-4 sm:px-6">
        <Button asChild variant="ghost" size="icon">
          <Link to="/" aria-label="Về thư viện">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="flex-1 font-display text-xl font-bold sm:text-2xl">Luyện tập cùng gam</h1>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-4 sm:px-6">
        {!isAudioSupported() && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">Trình duyệt này không hỗ trợ phát âm thanh.</p>
        )}

        <Segmented
          label="Chế độ luyện"
          value={s.mode}
          options={[
            { value: "scale", label: "Âm giai" },
            { value: "longtone", label: "Nốt dài" },
          ]}
          onChange={(mode) => set({ mode })}
          className="rounded-lg bg-muted p-1 [&>button]:min-h-10"
        />

        {/* ===== màn hình chính ===== */}
        <section className="rounded-2xl border bg-card p-4 sm:p-6" aria-label="Bài tập">
          <div className="mb-4 text-center">
            <div className="font-display text-2xl font-bold">{title}</div>
            <div className="text-sm text-muted-foreground">
              {transpose.semitones !== 0 ? (
                <>
                  Concert: {noteText(concert)} ({letterText(concert)}) ·{" "}
                </>
              ) : (
                <>({letterText(written)}) · </>
              )}
              {s.mode === "scale"
                ? `${s.bpm} BPM · ${s.notesPerBeat} nốt/phách`
                : `${s.bpm} BPM · giữ ${s.hold}, nghỉ ${s.rest} phách`}
            </div>
          </div>

          {s.mode === "longtone" ? (
            <LongToneDisplay seq={seq} step={step} hold={s.hold} rest={s.rest} />
          ) : (
            <>
              <div className="mb-3 flex h-8 items-center justify-center" aria-live="polite">
                {step?.phase === "countin" ? (
                  <span className="font-display text-2xl font-extrabold tabular-nums">Đếm vào: {step.left}</span>
                ) : (
                  <BeatDots beat={runner.running ? runner.beat : -1} />
                )}
              </div>
              <NoteChips seq={seq} activeIndex={activeIndex} onPick={preview} />
            </>
          )}

          <div className="mt-6 hidden justify-center sm:flex">
            <StartButton running={runner.running} onClick={toggle} />
          </div>
          <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">
            Phím Space hoặc pedal để bắt đầu / dừng · ← → đổi chủ âm
          </p>
        </section>

        {/* ===== cài đặt ===== */}
        <section className="space-y-5" aria-label="Cài đặt bài tập">
          <Field label="Nhịp độ">
            <BpmControl bpm={s.bpm} onChange={(v) => set({ bpm: clampBpm(v) })} />
          </Field>

          <Field label="Chủ âm" hint={transpose.semitones !== 0 ? "Theo giọng viết của kèn; dòng nhỏ là cao độ concert." : undefined}>
            <TonicPicker value={s.tonic} type={s.type} transpose={transpose} onChange={(tonic) => set({ tonic })} />
          </Field>

          <Field label="Loại gam">
            <Segmented
              label="Loại gam"
              value={s.type}
              options={SCALE_TYPES.map((t) => ({ value: t.id, label: t.label }))}
              onChange={(type) => set({ type })}
              className="grid grid-cols-2 sm:grid-cols-4"
            />
          </Field>

          {s.mode === "scale" && (
            <Field label="Bài tập">
              <Segmented
                label="Bài tập"
                value={s.exercise}
                options={EXERCISES.map((e) => ({ value: e.id, label: e.id === "arpeggio" ? "Hợp âm rải 1-3-5-8" : e.label }))}
                onChange={(exercise) => set({ exercise })}
              />
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Số quãng tám">
              <Segmented
                label="Số quãng tám"
                value={s.octaves}
                options={[
                  { value: 1, label: "1 quãng" },
                  { value: 2, label: "2 quãng" },
                ]}
                onChange={(octaves) => set({ octaves })}
              />
            </Field>
            <Field label="Bắt đầu từ">
              <Segmented
                label="Quãng tám bắt đầu"
                value={s.octaveShift}
                options={[
                  { value: -1, label: "Thấp" },
                  { value: 0, label: "Giữa" },
                  { value: 1, label: "Cao" },
                ]}
                onChange={(octaveShift) => set({ octaveShift })}
              />
            </Field>
          </div>

          <Field label="Kiểu chạy">
            <Segmented
              label="Kiểu chạy"
              value={s.pattern}
              options={PATTERNS.filter((p) => s.mode === "scale" || p.id !== "thirds").map((p) => ({
                value: p.id,
                label: p.id === "thirds" ? "Quãng 3 (1-3, 2-4…)" : p.label,
              }))}
              onChange={(pattern) => set({ pattern })}
            />
          </Field>

          {s.mode === "scale" ? (
            <Field label="Số nốt mỗi phách">
              <Segmented
                label="Số nốt mỗi phách"
                value={s.notesPerBeat}
                options={[
                  { value: 1, label: "1 (đen)" },
                  { value: 2, label: "2 (móc đơn)" },
                ]}
                onChange={(notesPerBeat) => set({ notesPerBeat })}
              />
            </Field>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Giữ mỗi nốt">
                <Segmented
                  label="Số phách giữ mỗi nốt"
                  value={s.hold}
                  options={HOLD_OPTIONS.map((n) => ({ value: n, label: `${n} phách` }))}
                  onChange={(hold) => set({ hold })}
                />
              </Field>
              <Field label="Nghỉ sau mỗi nốt">
                <Segmented
                  label="Số phách nghỉ"
                  value={s.rest}
                  options={REST_OPTIONS.map((n) => ({ value: n, label: n ? `${n}` : "Không" }))}
                  onChange={(rest) => set({ rest })}
                />
              </Field>
            </div>
          )}

          <div className="space-y-3 rounded-xl border p-3">
            <ToggleRow label="Đếm vào 1 ô nhịp" hint={`${BEATS_PER_BAR} tiếng click trước khi bắt đầu`} checked={s.countIn} onChange={(countIn) => set({ countIn })} />
            <ToggleRow label="Nốt tham chiếu" hint="Phát cao độ chuẩn của từng nốt" checked={s.refTone} onChange={(refTone) => set({ refTone })} />
            <ToggleRow
              label="Drone chủ âm"
              hint={`Ngân nốt ${noteText(concert)} (concert) suốt bài tập`}
              checked={s.drone}
              onChange={(v) => set({ drone: v })}
            />
          </div>

          <details className="group rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-semibold select-none">Giọng kèn & âm lượng</summary>
            <div className="mt-4 space-y-5">
              <InstrumentPicker value={transpose} onChange={setTranspose} />
              <div className="space-y-3">
                <VolumeRow label="Tiếng nhịp" value={audio.metroVolume} onChange={(v) => setAudio({ metroVolume: v })} />
                <VolumeRow label="Nốt tham chiếu" value={s.toneVolume} onChange={(v) => set({ toneVolume: v })} />
                <VolumeRow label="Drone" value={audio.droneVolume} onChange={(v) => setAudio({ droneVolume: v })} />
              </div>
            </div>
          </details>
        </section>
      </main>

      {/* nút bắt đầu dính đáy trên điện thoại */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 p-3 backdrop-blur-md sm:hidden">
        <StartButton running={runner.running} onClick={toggle} />
      </div>
    </div>
  );
}

function StartButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="lg" onClick={onClick} className="h-12 w-full gap-2 rounded-full text-base sm:w-56" variant={running ? "secondary" : "default"}>
      {running ? <Pause /> : <Play />} {running ? "Dừng" : "Bắt đầu"}
    </Button>
  );
}

function BeatDots({ beat }: { beat: number }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-all duration-75",
            i === 0 ? "size-3.5" : "size-2.5",
            beat === i ? (i === 0 ? "scale-125 bg-primary" : "scale-125 bg-foreground") : "bg-muted-foreground/25",
          )}
        />
      ))}
    </div>
  );
}

/** drone chạy khi bật công tắc VÀ bài tập đang chạy */
function useSyncDrone(want: boolean, drone: ReturnType<typeof useDrone>) {
  const { running, start, stop } = drone;
  useEffect(() => {
    if (want && !running) start();
    else if (!want && running) stop();
  }, [want, running, start, stop]);
}
