import { useCallback, useEffect, useRef, useState } from "react";
import { audioNow, bpmToInterval, playTone, stopTones } from "@/lib/audio/engine";
import { longToneStep, scaleStep, type PracticeNote } from "@/lib/practice/scales";
import type { PracticeMode } from "@/lib/practice/settings";
import { useMetronome } from "./useMetronome";

export const BEATS_PER_BAR = 4;

/** display state: count-in (`left` beats to go) / playing note `index` / resting */
export type RunnerStep =
  | { phase: "countin"; left: number }
  | { phase: "note"; index: number; beat: number }
  | { phase: "rest"; index: number; beat: number };

export interface PracticeRunnerOptions {
  mode: PracticeMode;
  seq: PracticeNote[];
  bpm: number;
  notesPerBeat: 1 | 2;
  countIn: boolean;
  refTone: boolean;
  hold: number;
  rest: number;
  metroVolume: number;
  toneVolume: number;
}

/**
 * Drives an exercise from the metronome: on every scheduled click, work out the step, play the reference tone
 * exactly at the click time, then set a timer to highlight the note when that click is actually heard.
 * Stops on unmount / hidden tab (useMetronome handles that; here we clean up reference tones and state).
 */
export function usePracticeRunner(o: PracticeRunnerOptions) {
  const cfg = useRef(o);
  cfg.current = o;
  const tick = useRef(0);
  const timers = useRef(new Set<number>());
  const [step, setStep] = useState<RunnerStep | null>(null);

  const subdivision = o.mode === "scale" ? o.notesPerBeat : 1;

  const onSchedule = useCallback((_beat: number, time: number) => {
    const c = cfg.current;
    const t = tick.current++;
    const sub = c.mode === "scale" ? c.notesPerBeat : 1;
    const countInTicks = c.countIn ? BEATS_PER_BAR * sub : 0;
    const len = c.seq.length;
    if (!len) return;
    const interval = bpmToInterval(c.bpm, sub);
    let next: RunnerStep;

    if (c.mode === "scale") {
      const s = scaleStep(t, { length: len, ticksPerBar: BEATS_PER_BAR * sub, countInTicks });
      if (s.phase === "countin") next = { phase: "countin", left: BEATS_PER_BAR - Math.floor(s.tick / sub) };
      else if (s.phase === "rest") next = { phase: "rest", index: s.index, beat: 0 };
      else {
        next = { phase: "note", index: s.index, beat: 0 };
        if (c.refTone) playTone(c.seq[s.index].frequency, interval * s.ticks * 0.9, c.toneVolume, time);
      }
    } else {
      const s = longToneStep(t, { length: len, hold: c.hold, rest: c.rest, countInTicks });
      if (s.phase === "countin") next = { phase: "countin", left: BEATS_PER_BAR - s.tick };
      else if (s.phase === "rest") next = { phase: "rest", index: s.index, beat: s.beat };
      else {
        next = { phase: "note", index: s.index, beat: s.beat };
        if (c.refTone && s.beat === 0) playTone(c.seq[s.index].frequency, interval * c.hold * 0.95, c.toneVolume, time);
      }
    }

    const delay = Math.max(0, (time - audioNow()) * 1000);
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      setStep(next);
    }, delay);
    timers.current.add(id);
  }, []);

  const metro = useMetronome({
    bpm: o.bpm,
    beatsPerBar: BEATS_PER_BAR,
    subdivision,
    volume: o.metroVolume,
    onSchedule,
  });

  const clear = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current.clear();
    stopTones();
    setStep(null);
  }, []);

  const { start: metroStart, stop: metroStop, running } = metro;

  const start = useCallback(() => {
    clear();
    tick.current = 0;
    metroStart();
  }, [clear, metroStart]);

  const stop = useCallback(() => {
    metroStop();
    clear();
  }, [clear, metroStop]);

  const toggle = useCallback(() => (running ? stop() : start()), [running, start, stop]);

  // metronome stopped by itself (hidden tab / unmount) → clear tones and state too
  useEffect(() => {
    if (!running) clear();
  }, [running, clear]);
  useEffect(() => clear, [clear]);

  // mode / notes per beat / sequence changed mid-run → restart from the top to stay on the beat
  const structure = `${o.mode}|${subdivision}|${o.seq.length}|${o.hold}|${o.rest}`;
  const lastStructure = useRef(structure);
  useEffect(() => {
    if (lastStructure.current === structure) return;
    lastStructure.current = structure;
    if (running) {
      metroStop();
      clear();
      tick.current = 0;
      metroStart();
    }
  }, [structure, running, metroStart, metroStop, clear]);

  return { running, step, start, stop, toggle, beat: metro.beat };
}
