import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Song } from "@shared/types";
import { autoColumns, fitGrid, paginateBook } from "@/lib/stage/math";
import { StageContent } from "./StageContent";

/** "all" = thu nhỏ để hiện tất cả các trang trên một màn hình */
export type ColumnsPref = "auto" | 1 | 2 | 3 | 4 | "all";
export type TurnBy = "spread" | "page";

/** lề trên của khu sách (thanh điều khiển đã nằm ngoài, không che trang) */
const PAD_TOP = 20;
const FLIP_MS = 720;
const SLIDE_MS = 420;
const EASE_FLIP = [0.55, 0.05, 0.35, 1] as const;

interface Turn {
  id: number;
  from: number;
  dir: 1 | -1;
  by: TurnBy;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Chế độ "quyển sách": nội dung chia thành các trang cao vừa màn hình, xếp cạnh nhau.
 * `first` là trang đầu tiên đang hiện.
 * Lật cả mặt: tờ giấy xoay quanh gáy sách ở giữa màn hình (mặt sau là trang mới), như sách thật.
 * Lật từng trang: dải trang trượt sang một ô.
 */
export function BookView({
  song,
  scale,
  colored,
  first,
  columns,
  turnBy,
  onLayout,
  onStep,
}: {
  song: Song;
  scale: number;
  colored: boolean;
  first: number;
  columns: ColumnsPref;
  turnBy: TurnBy;
  onLayout: (l: { pageCount: number; cols: number }) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pages, setPages] = useState<{ start: number; height: number }[]>([]);
  const [turn, setTurn] = useState<Turn | null>(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = size.w < 640;
  const fitAll = columns === "all";
  const cols = fitAll ? 1 : columns === "auto" ? autoColumns(size.w, size.h) : columns;
  // chỗ cho số trang bên dưới tờ giấy
  const padBottom = 38;
  const padX = cols > 1 ? 28 : narrow ? 12 : 24;
  const gap = cols > 1 ? 24 : 0;
  const paperPadX = narrow ? 18 : 30;
  const paperPadY = narrow ? 22 : 32;
  // chế độ "tất cả": mỗi trang có cỡ tự nhiên như một trang đọc thoải mái, rồi cả lưới được thu nhỏ cho vừa
  const colW = fitAll
    ? Math.min(640, Math.max(280, size.w - padX * 2))
    : Math.max(200, Math.floor((size.w - padX * 2 - gap * (cols - 1)) / cols));
  const innerW = colW - paperPadX * 2;
  // chế độ "tất cả": trang cao ít nhất theo tỉ lệ A4 để mỗi ảnh sheet nằm trọn một ô, không bị cắt đôi
  const paperH = Math.max(180, size.h - PAD_TOP - padBottom, fitAll ? Math.round(innerW * 1.45) + paperPadY * 2 : 0);
  const pageH = paperH - paperPadY * 2;

  // đo nội dung ở đúng chiều rộng cột để chia trang
  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m || !size.h) return;
    const measure = () => {
      const bps = Array.from(m.querySelectorAll<HTMLElement>("[data-break]")).map((e) => e.offsetTop);
      const next = paginateBook(m.scrollHeight, pageH, bps);
      setPages((prev) =>
        prev.length === next.length && prev.every((p, i) => p.start === next[i].start && p.height === next[i].height)
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(m);
    return () => ro.disconnect();
  }, [innerW, pageH, size.h, song, scale]);

  useEffect(() => {
    if (pages.length) onLayout({ pageCount: pages.length, cols: fitAll ? pages.length : cols });
  }, [pages.length, cols, fitAll, onLayout]);

  // phát hiện lần lật trang để chạy hiệu ứng
  const prev = useRef({ first, cols });
  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = { first, cols };
    if (p.first === first || p.cols !== cols || prefersReducedMotion()) return;
    setTurn({ id: performance.now(), from: p.first, dir: first > p.first ? 1 : -1, by: turnBy });
  }, [first, cols, turnBy]);

  // lăn chuột / touchpad
  const wheel = useRef({ acc: 0, lockUntil: 0 });
  const onWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const w = wheel.current;
    const now = performance.now();
    if (now < w.lockUntil) {
      // quán tính touchpad vẫn còn: kéo dài khoá để một lần vuốt = một lần lật
      w.lockUntil = Math.max(w.lockUntil, now + 140);
      w.acc = 0;
      return;
    }
    w.acc += d;
    if (Math.abs(w.acc) > 50) {
      onStep(w.acc > 0 ? 1 : -1);
      w.acc = 0;
      w.lockUntil = now + Math.min(FLIP_MS, 600);
    }
  };

  // vuốt trên màn hình cảm ứng
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
    else if (Math.abs(dy) > 60) onStep(dy < 0 ? 1 : -1);
  };

  const ready = size.w > 0 && pages.length > 0;
  const W = size.w;
  const half = W / 2;

  const renderPaper = (i: number, label = true, h = paperH) =>
    i < pages.length ? (
      <>
        <div
          className="overflow-hidden rounded-lg bg-stage-paper shadow-[0_1px_3px_rgb(0_0_0/0.12),0_10px_30px_-10px_rgb(0_0_0/0.3)]"
          style={{ padding: `${paperPadY}px ${paperPadX}px`, height: h }}
        >
          <div className="overflow-hidden" style={{ height: pages[i].height }}>
            <div style={{ transform: `translateY(${-pages[i].start}px)` }}>
              <StageContent song={song} scale={scale} colored={colored} fit />
            </div>
          </div>
        </div>
        {label && (
          <div className="pt-2 text-center font-mono text-xs text-stage-lyric tabular-nums">
            {i + 1} / {pages.length}
          </div>
        )}
      </>
    ) : (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-stage-fg/15 text-sm text-stage-lyric"
        style={{ height: paperH }}
      >
        Hết bài
      </div>
    );

  /** một "mặt sách": các trang bắt đầu từ `start`, rộng đúng khung */
  const spread = (start: number) => (
    <div className="flex h-full" style={{ width: W, paddingLeft: padX, paddingRight: padX, paddingTop: PAD_TOP, gap }}>
      {Array.from({ length: cols }, (_, k) => start + k).map((i) => (
        <div key={i} className="flex flex-col" style={{ width: colW }}>
          {renderPaper(i)}
        </div>
      ))}
    </div>
  );

  /** lưới tất cả các trang, thu nhỏ vừa một màn hình */
  const allPages = () => {
    const GRID_PAD = 16;
    const GRID_GAP = 14;
    const LABEL_H = 20;
    // tờ giấy chỉ cao vừa nội dung dài nhất — bỏ khoảng trắng thừa để chữ to hơn
    const itemH = Math.min(paperH, Math.max(...pages.map((p) => p.height)) + paperPadY * 2);
    const g = fitGrid(
      pages.length,
      colW,
      itemH,
      size.w - GRID_PAD * 2,
      size.h - GRID_PAD * 2,
      GRID_GAP,
      LABEL_H,
    );
    const cellW = colW * g.scale;
    const cellH = itemH * g.scale;
    return (
      <div
        className="grid h-full content-center justify-center"
        style={{
          padding: GRID_PAD,
          gap: GRID_GAP,
          gridTemplateColumns: `repeat(${g.cols}, ${cellW}px)`,
        }}
      >
        {pages.map((_, i) => (
          <div key={i} className="flex flex-col">
            <div style={{ width: cellW, height: cellH }} className="overflow-hidden">
              <div style={{ width: colW, transform: `scale(${g.scale})`, transformOrigin: "top left" }}>
                {renderPaper(i, false, itemH)}
              </div>
            </div>
            <div className="text-center font-mono text-[11px] leading-5 text-stage-lyric tabular-nums">{i + 1}</div>
          </div>
        ))}
      </div>
    );
  };

  const flipping = turn?.by === "spread" ? turn : null;
  const sliding = turn?.by === "page" ? turn : null;
  const done = (id: number) => setTurn((t) => (t?.id === id ? null : t));

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 overflow-hidden bg-stage-fg/[0.05]"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* bản đo ẩn */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0"
        style={{ width: innerW }}
      >
        <StageContent song={song} scale={scale} colored={colored} fit />
      </div>

      {ready && fitAll && allPages()}

      {ready && !fitAll && (
        <>
          {/* mặt sách hiện tại (nằm dưới cùng) */}
          <motion.div
            key={`${first}-${cols}`}
            className="absolute inset-0"
            initial={sliding ? { x: sliding.dir * (colW + gap) } : false}
            animate={{ x: 0 }}
            transition={{ duration: SLIDE_MS / 1000, ease: [0.25, 0.8, 0.3, 1] }}
            onAnimationComplete={() => sliding && done(sliding.id)}
          >
            {spread(first)}
          </motion.div>

          {flipping && (
            <SpineFlip
              key={flipping.id}
              dir={flipping.dir}
              width={W}
              half={half}
              oldSpread={spread(flipping.from)}
              newSpread={spread(first)}
              onDone={() => done(flipping.id)}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Lật sách thật: nửa phải (lật tới) xoay 180° quanh gáy ở giữa.
 * Mặt trước = nửa phải của mặt sách cũ, mặt sau = nửa trái của mặt sách mới.
 */
function SpineFlip({
  dir,
  width,
  half,
  oldSpread,
  newSpread,
  onDone,
}: {
  dir: 1 | -1;
  width: number;
  half: number;
  oldSpread: React.ReactNode;
  newSpread: React.ReactNode;
  onDone: () => void;
}) {
  const forward = dir > 0;
  const face = "absolute inset-0 overflow-hidden [backface-visibility:hidden]";
  const shade = forward
    ? "linear-gradient(to right, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0) 35%)"
    : "linear-gradient(to left, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0) 35%)";
  const shadeBack = forward
    ? "linear-gradient(to left, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0) 35%)"
    : "linear-gradient(to right, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0) 35%)";
  const t = { duration: FLIP_MS / 1000, ease: EASE_FLIP };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ perspective: 2200 }}>
      {/* nửa bên kia vẫn là trang cũ cho tới khi tờ giấy đáp xuống */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: forward ? `inset(0 ${half}px 0 0)` : `inset(0 0 0 ${half}px)` }}
      >
        {oldSpread}
      </div>

      {/* bóng đổ lên nửa trang mới bị lộ ra */}
      <motion.div
        className="absolute inset-y-0 bg-black"
        style={{ left: forward ? half : 0, width: half }}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0 }}
        transition={t}
      />

      {/* tờ giấy đang lật */}
      <motion.div
        className="absolute inset-y-0 [transform-style:preserve-3d]"
        style={{
          left: forward ? half : 0,
          width: half,
          transformOrigin: forward ? "left center" : "right center",
        }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: forward ? -180 : 180 }}
        transition={t}
        onAnimationComplete={onDone}
      >
        {/* mặt trước: nửa cũ */}
        <div className={face}>
          <div className="absolute top-0 h-full" style={{ left: forward ? -half : 0, width }}>
            {oldSpread}
          </div>
          <motion.div
            className="absolute inset-0"
            style={{ background: shade }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1] }}
            transition={{ ...t, times: [0, 0.5, 1] }}
          />
        </div>
        {/* mặt sau: nửa mới */}
        <div className={face} style={{ transform: "rotateY(180deg)" }}>
          <div className="absolute top-0 h-full" style={{ left: forward ? 0 : -half, width }}>
            {newSpread}
          </div>
          <motion.div
            className="absolute inset-0"
            style={{ background: shadeBack }}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ ...t, times: [0, 0.5, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}
