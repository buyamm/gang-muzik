import { useCallback, useEffect, useRef, useState } from "react";
import { audioNow, createMetronome, type Metronome } from "@/lib/audio/engine";

export interface UseMetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  subdivision?: number;
  /** 0..1 */
  volume: number;
  /** called when each click (subdivisions included) is SCHEDULED; `time` is on the audioNow() clock, for notes in sync */
  onSchedule?: (beatIndex: number, time: number, sub: number) => void;
}

/** máy đếm nhịp: tự tắt khi unmount hoặc khi tab bị ẩn; `beat` = phách đang kêu (-1 khi tắt) */
export function useMetronome({ bpm, beatsPerBar, subdivision = 1, volume, onSchedule }: UseMetronomeOptions) {
  const ref = useRef<Metronome | null>(null);
  const timers = useRef(new Set<number>());
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const opts = useRef({ bpm, beatsPerBar, subdivision, volume, onSchedule });
  opts.current = { bpm, beatsPerBar, subdivision, volume, onSchedule };

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current.clear();
  };

  const stop = useCallback(() => {
    ref.current?.stop();
    clearTimers();
    setRunning(false);
    setBeat(-1);
  }, []);

  const start = useCallback(() => {
    const o = opts.current;
    const m = (ref.current ??= createMetronome(o));
    m.bpm = o.bpm;
    m.beatsPerBar = o.beatsPerBar;
    m.subdivision = o.subdivision;
    m.setVolume(o.volume);
    m.onBeat = (b, time, sub) => {
      opts.current.onSchedule?.(b, time, sub);
      if (sub !== 0) return;
      // tiếng được lên lịch trước ~100ms → chờ đúng lúc phát mới nháy đèn
      const delay = Math.max(0, (time - audioNow()) * 1000);
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        setBeat(b);
      }, delay);
      timers.current.add(id);
    };
    m.start();
    setRunning(m.running);
  }, []);

  const toggle = useCallback(() => (ref.current?.running ? stop() : start()), [start, stop]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.bpm = bpm;
    m.beatsPerBar = beatsPerBar;
    m.subdivision = subdivision;
  }, [bpm, beatsPerBar, subdivision]);

  useEffect(() => {
    ref.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [stop]);

  return { running, beat, start, stop, toggle };
}
