import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, SlidersHorizontal } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { AppFrame } from "@/components/AppFrame";
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
import { hornPreset, normalizeTranspose, NO_TRANSPOSE, type TransposeSetting } from "@/lib/notation/transpose";
import { practiceRange, practiceTranspose } from "@/lib/practice/instrument";
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

/** last chosen horn, shared with the song page (Stage) */
const TRANSPOSE_KEY = "gm:transpose";

/** the Stage pedal map, always with Space to start / stop */
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

  // what is actually played (sax presets at the horn's real pitch) and the written range to check against
  const horn = practiceTranspose(transpose);
  const range = practiceRange(transpose.preset);
  const scaleOpts = {
    tonic: s.tonic,
    type: s.type,
    exercise: s.exercise,
    octaves: s.octaves,
    pattern: s.pattern,
    transpose: horn,
    octaveShift: s.octaveShift,
    range,
  };
  const optsKey = JSON.stringify([scaleOpts, s.mode]);
  // recompute the sequence only when the settings really change (scaleOpts is a new object every render)
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

  const [sheet, setSheet] = useState(false);
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
  const written = keyName(s.tonic, def.minor, horn.spelling);
  const concert = concertKeyName(s.tonic, s.type, horn);
  const outOfRange = seq.filter((n) => n.outOfRange).length;
  const title = scaleTitle(written, s.type, s.exercise);
  const step = runner.step;
  const activeIndex = step && step.phase !== "countin" ? step.index : null;

  const preview = (i: number) => {
    if (runner.running) return;
    const n = seq[i];
    if (n) playTone(n.frequency, 0.8, s.toneVolume);
  };

  const settingsPanel = (
        <section className="@container space-y-6" aria-label="Cài đặt bài tập">
          <Field label="Nhịp độ">
            <BpmControl bpm={s.bpm} onChange={(v) => set({ bpm: clampBpm(v) })} />
          </Field>

          <Field label="Chủ âm" hint={horn.semitones !== 0 ? "Theo giọng viết của kèn; dòng nhỏ là cao độ concert." : undefined}>
            <TonicPicker value={s.tonic} type={s.type} transpose={horn} onChange={(tonic) => set({ tonic })} />
          </Field>

          <Field label="Loại gam">
            <Segmented
              label="Loại gam"
              value={s.type}
              options={SCALE_TYPES.map((t) => ({ value: t.id, label: t.label }))}
              onChange={(type) => set({ type })}
              className="grid grid-cols-2 @lg:grid-cols-4"
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

          <div className="grid gap-5 @lg:grid-cols-2">
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
            <div className="grid gap-5 @lg:grid-cols-2">
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

          <Card padding={4}>
          <div className="space-y-4">
            <ToggleRow label="Đếm vào 1 ô nhịp" hint={`${BEATS_PER_BAR} tiếng click trước khi bắt đầu`} checked={s.countIn} onChange={(countIn) => set({ countIn })} />
            <ToggleRow label="Nốt tham chiếu" hint="Phát cao độ chuẩn của từng nốt" checked={s.refTone} onChange={(refTone) => set({ refTone })} />
            <ToggleRow
              label="Drone chủ âm"
              hint={`Ngân nốt ${noteText(concert)} (concert) suốt bài tập`}
              checked={s.drone}
              onChange={(v) => set({ drone: v })}
            />
          </div>
          </Card>

          <Card padding={4}>
          <Collapsible trigger="Giọng kèn & âm lượng" defaultIsOpen={false}>
            <div className="space-y-5 pt-4">
              <InstrumentPicker value={transpose} onChange={setTranspose} />
              <div className="space-y-3">
                <VolumeRow label="Tiếng nhịp" value={audio.metroVolume} onChange={(v) => setAudio({ metroVolume: v })} />
                <VolumeRow label="Nốt tham chiếu" value={s.toneVolume} onChange={(v) => set({ toneVolume: v })} />
                <VolumeRow label="Drone" value={audio.droneVolume} onChange={(v) => setAudio({ droneVolume: v })} />
              </div>
            </div>
          </Collapsible>
          </Card>
        </section>
  );

  return (
    <AppFrame>
      <Layout
        height="auto"
        end={
          <div className="hidden xl:block">
            <LayoutPanel hasDivider padding={6} width={380} label="Cài đặt bài tập">
              <VStack gap={4}>
                <Heading level={2}>Cài đặt bài tập</Heading>
                {settingsPanel}
              </VStack>
            </LayoutPanel>
          </div>
        }
        content={
          <LayoutContent padding={8} role="main">
            <VStack gap={6}>
              <VStack gap={2}>
                <Heading level={1}>Luyện gam</Heading>
                <Text color="secondary">Chạy âm giai hoặc giữ nốt dài theo nhịp, có nốt tham chiếu và drone chủ âm.</Text>
              </VStack>
              {!isAudioSupported() && <Banner status="error" title="Trình duyệt này không hỗ trợ phát âm thanh." />}

              <TabList hasDivider value={s.mode} onChange={(mode) => set({ mode: mode as typeof s.mode })}>
                <Tab value="scale" label="Âm giai" />
                <Tab value="longtone" label="Nốt dài" />
              </TabList>

              <Card padding={8}>
                <section aria-label="Bài tập">
                  <VStack gap={6} hAlign="center">
                    <VStack gap={1} hAlign="center">
            <Heading level={2}>{title}</Heading>
            <Text type="supporting" color="secondary">
              {horn.semitones !== 0 ? (
                <>
                  Concert: {noteText(concert)} ({letterText(concert)}) ·{" "}
                </>
              ) : (
                <>({letterText(written)}) · </>
              )}
              {s.mode === "scale"
                ? `${s.bpm} BPM · ${s.notesPerBeat} nốt/phách`
                : `${s.bpm} BPM · giữ ${s.hold}, nghỉ ${s.rest} phách`}
            </Text>
                    </VStack>
                    <div className="w-full">
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

          {outOfRange > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {outOfRange} nốt ngoài tầm của {hornPreset(transpose.preset)?.name ?? "kèn"} (ô viền đứt) — thử đổi “Bắt đầu từ”.
            </p>
          )}
                    </div>
                    <StartButton running={runner.running} onClick={toggle} />
                    <Text type="supporting" color="secondary">
                      Phím Space hoặc pedal để bắt đầu / dừng · ← → đổi chủ âm
                    </Text>
                  </VStack>
                </section>
              </Card>

              {/* phones and tablets: settings live in a bottom sheet */}
              <div className="xl:hidden">
                <Button width="100%" size="lg" label="Cài đặt bài tập" icon={<Icon icon={SlidersHorizontal} />} onClick={() => setSheet(true)} />
              </div>
            </VStack>
          </LayoutContent>
        }
      />
      <BottomSheet isOpen={sheet} onOpenChange={setSheet} label="Cài đặt bài tập" height="tall" padding={6}>
        {settingsPanel}
      </BottomSheet>
    </AppFrame>
  );
}

function StartButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <div className="w-full sm:w-56">
      <Button
        size="lg"
        width="100%"
        variant={running ? "secondary" : "primary"}
        label={running ? "Dừng" : "Bắt đầu"}
        icon={<Icon icon={running ? Pause : Play} />}
        onClick={onClick}
      />
    </div>
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

/** the drone runs while its switch is on AND the exercise is running */
function useSyncDrone(want: boolean, drone: ReturnType<typeof useDrone>) {
  const { running, start, stop } = drone;
  useEffect(() => {
    if (want && !running) start();
    else if (!want && running) stop();
  }, [want, running, start, stop]);
}
