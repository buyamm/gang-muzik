import { cn } from "@/lib/utils";

/** 7 nốt Đô→Si theo đúng vị trí trên khuông khoá Sol (Đô có dòng kẻ phụ). */
export const SCALE = [
  { name: "Do", label: "Đô", cls: "fill-note-do text-note-do", step: 0 },
  { name: "Re", label: "Rê", cls: "fill-note-re text-note-re", step: 1 },
  { name: "Mi", label: "Mi", cls: "fill-note-mi text-note-mi", step: 2 },
  { name: "Fa", label: "Fa", cls: "fill-note-fa text-note-fa", step: 3 },
  { name: "Sol", label: "Sol", cls: "fill-note-sol text-note-sol", step: 4 },
  { name: "La", label: "La", cls: "fill-note-la text-note-la", step: 5 },
  { name: "Si", label: "Si", cls: "fill-note-si text-note-si", step: 6 },
] as const;

export const NOTE_BG = [
  "bg-note-do",
  "bg-note-re",
  "bg-note-mi",
  "bg-note-fa",
  "bg-note-sol",
  "bg-note-la",
  "bg-note-si",
] as const;

/** Chọn ổn định một màu nốt cho một chuỗi (vd id bài) */
export function noteIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 7;
}

const GAP = 16; // khoảng cách giữa 2 dòng kẻ
const SPACING = 40;

/**
 * Gam Đô trưởng đi lên trên khuông nhạc, kèm tên nốt cùng màu với chế độ "tô màu nốt" ở trang chơi.
 * Dòng kẻ do lớp `.staff-lines` của khung cha vẽ; SVG này chỉ vẽ đầu nốt.
 */
export function ScaleNotes({ className, animate = true }: { className?: string; animate?: boolean }) {
  const width = SPACING * 7;
  const yOf = (step: number) => GAP * 4 - (step - 2) * (GAP / 2);
  return (
    <svg
      viewBox={`0 -4 ${width} ${GAP * 4 + 46}`}
      width={width}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Màu của 7 nốt Đô Rê Mi Fa Sol La Si"
    >
      {SCALE.map((n, i) => {
        const cx = SPACING * i + SPACING / 2;
        const cy = yOf(n.step);
        return (
          <g key={n.name} className={cn(n.cls, animate && "note-drop")} style={{ animationDelay: `${180 + i * 70}ms` }}>
            {n.step === 0 && <line x1={cx - 14} x2={cx + 14} y1={cy} y2={cy} className="stroke-muted-foreground/60" strokeWidth={1.5} />}
            <ellipse cx={cx} cy={cy} rx={8.6} ry={6.4} transform={`rotate(-22 ${cx} ${cy})`} />
            <text
              x={cx}
              y={GAP * 4 + 38}
              textAnchor="middle"
              className="fill-current font-display text-[13px] font-semibold"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Logo nhỏ: nốt nhạc màu Đô vắt ngang 4 dòng kẻ */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8 shrink-0", className)} aria-hidden>
      <path d="M2 20h60M2 30h60M2 40h60M2 50h60" className="stroke-foreground/30" strokeWidth={2.5} />
      <path d="M24 50a8 8 0 1 1-4.5-7.2V12l28-6v32a8 8 0 1 1-4.5-7.2V17l-19 4z" className="fill-primary" />
    </svg>
  );
}

/**
 * "Mô-típ" riêng cho từng bài: vài nốt trên khuông, cao độ và màu suy ra từ id,
 * để mỗi thẻ bài nhìn khác nhau và dễ nhớ.
 */
export function SongMotif({ seed, className }: { seed: string; className?: string }) {
  const color = SCALE[noteIndex(seed)].cls;
  // FNV-1a rồi xáo thêm mỗi nốt để cao độ đủ khác nhau giữa các bài
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const steps = Array.from({ length: 6 }, () => {
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return ((h >>> 0) % 9) + 0; // 0..8: từ Đô (dòng phụ) đến Rê trên
  });
  const gap = 8;
  const top = 8;
  const yOf = (s: number) => top + gap * 4 - (s - 2) * (gap / 2);
  return (
    <svg viewBox="0 0 240 56" preserveAspectRatio="xMidYMid meet" className={cn("h-10 w-full overflow-visible sm:h-14", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={-2000} x2={2240} y1={top + i * gap} y2={top + i * gap} className="stroke-staff" strokeWidth={1} />
      ))}
      <g className={color}>
        {steps.map((s, i) => {
          const cx = 30 + i * 36;
          const cy = yOf(s);
          return (
            <g key={i}>
              {s === 0 && <line x1={cx - 9} x2={cx + 9} y1={cy} y2={cy} className="stroke-staff" strokeWidth={1} />}
              <ellipse cx={cx} cy={cy} rx={5.4} ry={4} transform={`rotate(-22 ${cx} ${cy})`} />
              <line x1={cx + 4.9} x2={cx + 4.9} y1={cy - 1} y2={cy - 22} className="stroke-current" strokeWidth={1.4} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
