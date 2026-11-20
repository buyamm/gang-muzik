import { memo } from "react";
import { describeHoles, type HoleState } from "@/lib/sao/fingering";
import { cn } from "@/lib/utils";

/** hole centres in viewBox units: blow hole on the left, finger holes 1–6 with a gap between the hands */
const BLOW_X = 34;
const HOLE_X = [92, 122, 152, 196, 226, 256];
const CY = 30;
const R = 9;
const VIEW = { w: 300, h: 60 };

function Hole({ cx, state, accent, number }: { cx: number; state: HoleState; accent: boolean; number?: number }) {
  const fill = accent ? "var(--primary)" : "currentColor";
  const stroke = state !== "open" && accent ? "var(--primary)" : "currentColor";
  return (
    <g>
      <circle
        cx={cx}
        cy={CY}
        r={R}
        fill={state === "closed" ? fill : "currentColor"}
        fillOpacity={state === "closed" ? 1 : 0.06}
        stroke={stroke}
        strokeOpacity={state === "open" ? 0.7 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {state === "half" && (
        // upper half covered (finger slid down to uncover half the hole)
        <path d={`M ${cx - R} ${CY} A ${R} ${R} 0 0 1 ${cx + R} ${CY} Z`} fill={fill} />
      )}
      {number !== undefined && (
        <text
          x={cx}
          y={CY + R + 12}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.6}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {number}
        </text>
      )}
    </g>
  );
}

/**
 * Sáo trúc 6 lỗ seen from above, blow hole on the left. Closed holes are filled, open holes outlined,
 * half-covered holes half filled. Colours come from `currentColor` (and `--primary` when `accent`).
 */
export const SaoFingeringDiagram = memo(function SaoFingeringDiagram({
  holes,
  width = 260,
  accent = false,
  numbers = false,
  className,
  label,
}: {
  /** hole 1 (nearest the blow hole) first */
  holes: readonly HoleState[];
  /** rendered width in px; height follows the aspect ratio */
  width?: number;
  /** fill covered holes with the theme's primary colour instead of currentColor */
  accent?: boolean;
  /** print hole numbers 1–6 under the holes */
  numbers?: boolean;
  className?: string;
  /** overrides the generated aria-label */
  label?: string;
}) {
  const h = numbers ? VIEW.h + 6 : VIEW.h;
  return (
    <svg
      role="img"
      aria-label={label ?? `Sáo trúc: ${describeHoles(holes)}`}
      viewBox={`0 0 ${VIEW.w} ${h}`}
      width={width}
      height={Math.round((width * h) / VIEW.w)}
      className={cn("shrink-0", className)}
      strokeWidth={width < 160 ? 1.1 : 1.5}
    >
      {/* tube */}
      <rect
        x={6}
        y={CY - 17}
        width={VIEW.w - 12}
        height={34}
        rx={17}
        fill="currentColor"
        fillOpacity={0.05}
        stroke="currentColor"
        strokeOpacity={0.35}
        vectorEffect="non-scaling-stroke"
      />
      {/* node rings at both ends */}
      {[22, VIEW.w - 22].map((x) => (
        <line key={x} x1={x} y1={CY - 17} x2={x} y2={CY + 17} stroke="currentColor" strokeOpacity={0.25} vectorEffect="non-scaling-stroke" />
      ))}
      {/* blow hole */}
      <ellipse
        cx={BLOW_X}
        cy={CY}
        rx={8}
        ry={6}
        fill="currentColor"
        fillOpacity={0.55}
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
      {/* split between the hands */}
      <line x1={174} y1={CY - 12} x2={174} y2={CY + 12} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      {HOLE_X.map((cx, i) => (
        <Hole key={i} cx={cx} state={holes[i] ?? "open"} accent={accent} number={numbers ? i + 1 : undefined} />
      ))}
    </svg>
  );
});
