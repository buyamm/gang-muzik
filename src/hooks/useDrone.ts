import { useCallback, useEffect, useRef, useState } from "react";
import { createDrone, type Drone } from "@/lib/audio/engine";

/** nốt nền kéo dài: tự tắt khi unmount hoặc khi tab bị ẩn */
export function useDrone({ frequency, volume }: { frequency: number; volume: number }) {
  const ref = useRef<Drone | null>(null);
  const [running, setRunning] = useState(false);
  const freqRef = useRef(frequency);
  freqRef.current = frequency;
  const volRef = useRef(volume);
  volRef.current = volume;

  const stop = useCallback(() => {
    ref.current?.stop();
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (!ref.current) ref.current = createDrone(freqRef.current, volRef.current);
    ref.current.start(freqRef.current);
    setRunning(ref.current.running);
  }, []);

  const toggle = useCallback(() => (ref.current?.running ? stop() : start()), [start, stop]);

  useEffect(() => {
    ref.current?.setFrequency(frequency);
  }, [frequency]);

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

  return { running, start, stop, toggle };
}
