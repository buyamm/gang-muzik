/** practice page settings (stored as `gm:practice`) + normalisation of values read from localStorage */
import { clampBpm } from "@/lib/audio/math";
import { EXERCISES, PATTERNS, SCALE_TYPES, type Exercise, type Pattern, type ScaleType } from "./scales";

export type PracticeMode = "scale" | "longtone";

export const HOLD_OPTIONS = [2, 4, 8] as const;
export const REST_OPTIONS = [0, 1, 2, 4] as const;

export interface PracticeSettings {
  mode: PracticeMode;
  /** tonic in the written key, 0..11 */
  tonic: number;
  type: ScaleType;
  exercise: Exercise;
  octaves: 1 | 2;
  pattern: Pattern;
  /** written start octave shift −1..1 */
  octaveShift: number;
  bpm: number;
  notesPerBeat: 1 | 2;
  countIn: boolean;
  /** play a reference tone for every note */
  refTone: boolean;
  /** tonic drone (concert) */
  drone: boolean;
  hold: (typeof HOLD_OPTIONS)[number];
  rest: (typeof REST_OPTIONS)[number];
  /** reference tone volume 0..1 */
  toneVolume: number;
}

export const PRACTICE_KEY = "gm:practice";

export const PRACTICE_DEFAULTS: PracticeSettings = {
  mode: "scale",
  tonic: 0,
  type: "major",
  exercise: "scale",
  octaves: 1,
  pattern: "updown",
  octaveShift: 0,
  bpm: 72,
  notesPerBeat: 1,
  countIn: true,
  refTone: false,
  drone: false,
  hold: 4,
  rest: 2,
  toneVolume: 0.6,
};

const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const clamp01 = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

export function normalizePractice(p: Partial<PracticeSettings> | null | undefined): PracticeSettings {
  const d = PRACTICE_DEFAULTS;
  const tonic = Number(p?.tonic);
  return {
    mode: pick(p?.mode, ["scale", "longtone"] as const, d.mode),
    tonic: Number.isInteger(tonic) ? ((tonic % 12) + 12) % 12 : d.tonic,
    type: pick(p?.type, SCALE_TYPES.map((s) => s.id), d.type),
    exercise: pick(p?.exercise, EXERCISES.map((e) => e.id), d.exercise),
    octaves: pick(p?.octaves, [1, 2] as const, d.octaves),
    pattern: pick(p?.pattern, PATTERNS.map((x) => x.id), d.pattern),
    octaveShift: pick(p?.octaveShift, [-1, 0, 1], d.octaveShift),
    bpm: typeof p?.bpm === "number" ? clampBpm(p.bpm) : d.bpm,
    notesPerBeat: pick(p?.notesPerBeat, [1, 2] as const, d.notesPerBeat),
    countIn: typeof p?.countIn === "boolean" ? p.countIn : d.countIn,
    refTone: typeof p?.refTone === "boolean" ? p.refTone : d.refTone,
    drone: typeof p?.drone === "boolean" ? p.drone : d.drone,
    hold: pick(p?.hold, HOLD_OPTIONS, d.hold),
    rest: pick(p?.rest, REST_OPTIONS, d.rest),
    toneVolume: clamp01(p?.toneVolume, d.toneVolume),
  };
}
