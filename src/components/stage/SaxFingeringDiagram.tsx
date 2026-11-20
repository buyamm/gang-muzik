import { memo, useId } from "react";
import { SAX_KEY_LABELS, type SaxKey } from "@/lib/sax/fingering";
import { cn } from "@/lib/utils";

type Shape =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number };

/**
 * Key layout in viewBox units, read top to bottom like a standard fingering chart:
 * left thumb octave key, palm keys + front F, left-hand main keys with bis, the left-pinky table,
 * then the right-hand main keys with the side-key column and the right-pinky keys.
 */
const LAYOUT: Record<SaxKey, Shape> = {
  octave: { kind: "ellipse", cx: 21, cy: 28, rx: 7.5, ry: 5 },
  palmD: { kind: "ellipse", cx: 33, cy: 47, rx: 4, ry: 6.5, rotate: -15 },
  palmEb: { kind: "ellipse", cx: 24, cy: 59, rx: 4, ry: 6.5, rotate: -15 },
  palmF: { kind: "ellipse", cx: 33, cy: 71, rx: 4, ry: 6.5, rotate: -15 },
  frontF: { kind: "ellipse", cx: 74, cy: 46, rx: 5.5, ry: 3.3, rotate: 25 },
  l1: { kind: "circle", cx: 56, cy: 60, r: 10.5 },
  bis: { kind: "circle", cx: 56, cy: 77.5, r: 3.6 },
  l2: { kind: "circle", cx: 56, cy: 95, r: 10.5 },
  l3: { kind: "circle", cx: 56, cy: 121, r: 10.5 },
  gSharp: { kind: "ellipse", cx: 91, cy: 123, rx: 9, ry: 4 },
  lowCSharp: { kind: "ellipse", cx: 85, cy: 134, rx: 5.5, ry: 4 },
  lowB: { kind: "ellipse", cx: 98, cy: 134, rx: 5.5, ry: 4 },
  lowBb: { kind: "ellipse", cx: 91.5, cy: 145, rx: 6.5, ry: 4 },
  r1: { kind: "circle", cx: 56, cy: 174, r: 10.5 },
  r2: { kind: "circle", cx: 56, cy: 200, r: 10.5 },
  r3: { kind: "circle", cx: 56, cy: 226, r: 10.5 },
  sideE: { kind: "rect", x: 80, y: 161, w: 8, h: 10.5 },
  sideC: { kind: "rect", x: 80, y: 174, w: 8, h: 10.5 },
  sideBb: { kind: "rect", x: 80, y: 187, w: 8, h: 10.5 },
  highFSharp: { kind: "rect", x: 80, y: 200, w: 8, h: 10.5 },
  lowEb: { kind: "ellipse", cx: 76, cy: 245, rx: 7.5, ry: 4 },
  lowC: { kind: "ellipse", cx: 76, cy: 256, rx: 7.5, ry: 4 },
};

const ORDER = Object.keys(LAYOUT) as SaxKey[];
const MAIN_KEYS: SaxKey[] = ["l1", "bis", "l2", "l3", "r1", "r2", "r3"];
const VIEW = { x: 8, y: 17, w: 104, h: 246 };

function KeyShape({ shape, pressed, accent }: { shape: Shape; pressed: boolean; accent: boolean }) {
  const paint = {
    fill: pressed ? (accent ? "var(--primary)" : "currentColor") : "currentColor",
    fillOpacity: pressed ? 1 : 0.07,
    stroke: pressed && accent ? "var(--primary)" : "currentColor",
    strokeOpacity: pressed ? 1 : 0.65,
    vectorEffect: "non-scaling-stroke" as const,
  };
  if (shape.kind === "circle") return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
  if (shape.kind === "rect")
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={2.5} {...paint} />;
  return (
    <ellipse
      cx={shape.cx}
      cy={shape.cy}
      rx={shape.rx}
      ry={shape.ry}
      transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
      {...paint}
    />
  );
}

/** Vietnamese description of a fingering, for screen readers */
export function describeFingering(keys: readonly SaxKey[]) {
  return keys.length ? `Bấm: ${keys.map((k) => SAX_KEY_LABELS[k]).join(", ")}` : "Không bấm phím nào";
}

/**
 * Hand-drawn saxophone fingering chart. Pressed keys are filled, open keys are outlined.
 * Colours come from `currentColor` (and `--primary` when `accent`), so it follows the theme.
 */
export const SaxFingeringDiagram = memo(function SaxFingeringDiagram({
  keys,
  height = 240,
  accent = false,
  className,
  label,
}: {
  keys: readonly SaxKey[];
  /** rendered height in px; width follows the aspect ratio */
  height?: number;
  /** fill pressed keys with the theme's primary colour instead of currentColor */
  accent?: boolean;
  className?: string;
  /** overrides the generated aria-label */
  label?: string;
}) {
  const pressed = new Set(keys);
  const maskId = useId();
  const strokeWidth = height < 140 ? 1.1 : 1.5;
  return (
    <svg
      role="img"
      aria-label={label ?? describeFingering(keys)}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      height={height}
      width={Math.round((height * VIEW.w) / VIEW.h)}
      className={cn("shrink-0", className)}
      strokeWidth={strokeWidth}
    >
      {/* instrument body guide (hidden behind the main keys) + split between the hands */}
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="white" />
        {MAIN_KEYS.map((k) => {
          const c = LAYOUT[k] as Extract<Shape, { kind: "circle" }>;
          return <circle key={k} cx={c.cx} cy={c.cy} r={c.r + 1.5} fill="black" />;
        })}
      </mask>
      <line
        x1={56}
        y1={42}
        x2={56}
        y2={240}
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={6}
        strokeLinecap="round"
        mask={`url(#${maskId})`}
      />
      <line
        x1={34}
        y1={159}
        x2={78}
        y2={159}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      {ORDER.map((k) => (
        <KeyShape key={k} shape={LAYOUT[k]} pressed={pressed.has(k)} accent={accent} />
      ))}
    </svg>
  );
});
