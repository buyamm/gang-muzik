import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Keyboard,
  Maximize,
  Minimize,
  Minus,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Song, SongSettings, ViewMode } from "@shared/types";
import { Button as AnimatedButton } from "@/components/animate-ui/components/buttons/button";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { Button } from "@/components/ui/button";
import { useFullscreen } from "@/hooks/useFullscreen";
import { keyLabel, loadKeyMap, saveKeyMap, usePedalKeys, type KeyMap, type PedalAction } from "@/hooks/usePedalKeys";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { formatDuration, speedFromDuration } from "@/lib/stage/math";
import { readPref, removePref, writePref } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { BookSettings } from "./BookSettings";
import { BookView, type ColumnsPref } from "./BookView";
import { KeyMapDialog } from "./KeyMapDialog";
import { StageContent } from "./StageContent";

interface ViewPrefs {
  mode: ViewMode;
  durationSec: number;
  fontScale: number;
  columns: ColumnsPref;
  /** lật cả mặt sách (spread) hay từng trang một */
  turnBy: "spread" | "page";
  /** auto = theo giao diện chung của website */
  theme: "auto" | "dark" | "light";
  colored: boolean;
}

const READ_LINE = 0.3;

function estimateDuration(song: Song) {
  if (song.pages.length) return Math.max(60, song.pages.length * 75);
  const lines = song.textContent.split("\n").filter((l) => l.trim()).length;
  return Math.min(600, Math.max(60, lines * 5));
}

function defaultsFor(song: Song): ViewPrefs {
  const s = song.settings;
  return {
    mode: s.mode ?? "scroll",
    durationSec: s.durationSec ?? estimateDuration(song),
    fontScale: s.fontScale ?? 1,
    columns: "auto",
    turnBy: "spread",
    theme: "auto",
    colored: true,
  };
}

export function Stage({
  song,
  isAdmin,
  onSaveDefaults,
}: {
  song: Song;
  isAdmin: boolean;
  onSaveDefaults?: (s: SongSettings) => Promise<unknown>;
}) {
  const prefKey = `gm:song:${song.id}`;
  const defaults = useMemo(() => defaultsFor(song), [song]);
  const [prefs, setPrefs] = useState<ViewPrefs>(() => readPref(prefKey, defaults));
  const update = useCallback(
    (patch: Partial<ViewPrefs>) =>
      setPrefs((p) => {
        const next = { ...p, ...patch };
        writePref(prefKey, next);
        return next;
      }),
    [prefKey],
  );

  const [playing, setPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownSec, setCountdownSec] = useState(() => readPref("gm:countdown", { n: 3 }).n);
  const [keymap, setKeymap] = useState<KeyMap>(loadKeyMap);
  const [keyDialog, setKeyDialog] = useState(false);
  // chỉ ẩn thanh điều khiển khi người dùng chủ động bấm "Ẩn" — không tự ẩn/hiện
  const [barsHidden, setBarsHidden] = useState(() => readPref("gm:bars", { hidden: false }).hidden);
  const [first, setFirst] = useState(0); // trang sách đầu tiên đang hiện
  const [book, setBook] = useState({ pageCount: 1, cols: 1 });
  const [progress, setProgress] = useState(0); // 0..1 cho chế độ cuộn

  const scrollRef = useRef<HTMLDivElement>(null);
  const turnBarRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(prefs.durationSec);
  durationRef.current = prefs.durationSec;

  const fs = useFullscreen();
  useWakeLock(true);

  const isScroll = prefs.mode === "scroll";
  const site = useTheme();
  const stageTheme = prefs.theme === "auto" ? site.resolved : prefs.theme;
  const { pageCount, cols } = book;
  const stepSize = prefs.turnBy === "page" ? 1 : cols;
  const maxFirst = prefs.turnBy === "page" ? Math.max(0, pageCount - cols) : Math.floor((pageCount - 1) / cols) * cols;
  const hasText = !!song.textContent.trim();

  const setBars = (hidden: boolean) => {
    setBarsHidden(hidden);
    writePref("gm:bars", { hidden });
  };

  // ---------- đếm ngược ----------
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setPlaying(true);
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const atEnd = useCallback(() => {
    if (isScroll) {
      const el = scrollRef.current;
      return !!el && el.scrollTop >= el.scrollHeight - el.clientHeight - 2;
    }
    return first >= maxFirst;
  }, [isScroll, first, maxFirst]);

  const togglePlay = useCallback(() => {
    if (countdown !== null) return setCountdown(null);
    if (playing) return setPlaying(false);
    if (atEnd()) {
      if (isScroll) scrollRef.current?.scrollTo({ top: 0 });
      else setFirst(0);
    }
    if (countdownSec > 0) setCountdown(countdownSec);
    else setPlaying(true);
  }, [countdown, playing, atEnd, isScroll, countdownSec]);

  // ---------- chế độ CUỘN ----------
  useEffect(() => {
    if (!isScroll || !playing) return;
    const el = scrollRef.current;
    if (!el) return;
    let pos = el.scrollTop;
    let last = performance.now();
    let raf = 0;
    const onScroll = () => {
      if (Math.abs(el.scrollTop - pos) > 3) pos = el.scrollTop; // người dùng tự kéo
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dist = el.scrollHeight - el.clientHeight;
      pos = Math.min(dist, pos + speedFromDuration(dist, durationRef.current) * dt);
      el.scrollTop = pos;
      if (pos >= dist - 0.5) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [isScroll, playing]);

  const onScrollProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.clientHeight;
    setProgress(dist > 0 ? el.scrollTop / dist : 0);
  }, []);

  // ---------- chế độ SÁCH ----------
  const onBookLayout = useCallback((l: { pageCount: number; cols: number }) => setBook(l), []);

  // giữ vị trí hợp lệ khi đổi số cột / số trang
  useEffect(() => {
    setFirst((f) => {
      const clamped = Math.min(f, maxFirst);
      return prefs.turnBy === "spread" ? Math.floor(clamped / cols) * cols : clamped;
    });
  }, [maxFirst, cols, prefs.turnBy]);

  const goNext = useCallback(() => setFirst((f) => Math.min(maxFirst, f + stepSize)), [maxFirst, stepSize]);
  const goPrev = useCallback(() => setFirst((f) => Math.max(0, f - stepSize)), [stepSize]);
  const onBookStep = useCallback((d: 1 | -1) => (d > 0 ? goNext() : goPrev()), [goNext, goPrev]);

  // tự lật theo thời gian: mỗi trang = thời lượng bài / số trang
  useEffect(() => {
    if (isScroll || !playing) {
      if (turnBarRef.current) turnBarRef.current.style.transform = "scaleX(0)";
      return;
    }
    if (first >= maxFirst) {
      setPlaying(false);
      return;
    }
    const perStep = (durationRef.current / pageCount) * stepSize * 1000;
    const begin = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min(1, (now - begin) / perStep);
      if (turnBarRef.current) turnBarRef.current.style.transform = `scaleX(${f})`;
      if (f >= 1) goNext();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isScroll, playing, first, maxFirst, pageCount, stepSize, prefs.durationSec, goNext]);

  // ---------- pedal / phím ----------
  const scrollBack = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: Math.max(0, el.scrollTop - el.clientHeight * 0.4), behavior: "smooth" });
  }, []);

  const onPedal = useCallback(
    (a: PedalAction) => {
      if (a === "toggle") return togglePlay();
      if (isScroll) return a === "next" ? togglePlay() : scrollBack();
      if (a === "next") goNext();
      else goPrev();
    },
    [togglePlay, isScroll, scrollBack, goNext, goPrev],
  );
  usePedalKeys(onPedal, keymap, !keyDialog);

  // ---------- chạm ----------
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (!isScroll && x < 0.3) return goPrev();
    if (!isScroll && x > 0.7) return goNext();
    togglePlay();
  };

  const switchMode = (mode: ViewMode) => {
    setPlaying(false);
    setCountdown(null);
    update({ mode });
  };

  const adjustDuration = (delta: number) =>
    update({ durationSec: Math.min(3600, Math.max(10, prefs.durationSec + delta)) });

  const saveDefaults = async () => {
    await onSaveDefaults?.({
      ...song.settings,
      mode: prefs.mode,
      durationSec: prefs.durationSec,
      fontScale: prefs.fontScale,
    });
    removePref(prefKey);
  };

  const zoomOut = () => update({ fontScale: Math.max(0.6, +(prefs.fontScale - 0.1).toFixed(2)) });
  const zoomIn = () => update({ fontScale: Math.min(3, +(prefs.fontScale + 0.1).toFixed(2)) });

  /** các nút công cụ — trên máy tính nằm ở header, trên điện thoại nằm ở footer */
  const tools = (
    <>
      <IconBtn label="Thu nhỏ" onClick={zoomOut}>
        <ZoomOut />
      </IconBtn>
      <IconBtn label="Phóng to" onClick={zoomIn}>
        <ZoomIn />
      </IconBtn>
      {hasText && (
        <IconBtn label="Tô màu nốt" active={prefs.colored} onClick={() => update({ colored: !prefs.colored })}>
          <Palette />
        </IconBtn>
      )}
      <IconBtn
        label={stageTheme === "dark" ? "Nền sáng" : "Nền tối"}
        onClick={() => update({ theme: stageTheme === "dark" ? "light" : "dark" })}
      >
        {stageTheme === "dark" ? <Sun /> : <Moon />}
      </IconBtn>
      <IconBtn label="Pedal & phím tắt" onClick={() => setKeyDialog(true)}>
        <Keyboard />
      </IconBtn>
      {fs.supported && (
        <IconBtn label={fs.isFull ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={fs.toggle}>
          {fs.isFull ? <Minimize /> : <Maximize />}
        </IconBtn>
      )}
      {isAdmin && onSaveDefaults && (
        <IconBtn label="Lưu cài đặt làm mặc định cho bài" onClick={saveDefaults}>
          <Save />
        </IconBtn>
      )}
    </>
  );

  const nextKey = keyLabel(keymap.next[0] ?? "→");
  const prevKey = keyLabel(keymap.prev[0] ?? "←");

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col bg-stage-bg text-stage-fg",
        stageTheme === "light" ? "stage-light" : "dark",
      )}
    >
      {/* thanh tiến độ trên cùng */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-stage-fg/10">
        {isScroll ? (
          <div className="h-full origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} />
        ) : (
          <div ref={turnBarRef} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
        )}
      </div>

      {/* ===== header (cố định, không tự ẩn) ===== */}
      {!barsHidden && (
        <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-stage-fg/10 bg-stage-bg px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 sm:px-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 text-stage-fg hover:bg-stage-fg/10">
            <Link to="/" aria-label="Về thư viện" title="Về thư viện">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg leading-tight font-bold">{song.title}</h1>
            {song.artist && <p className="truncate text-xs text-stage-lyric">{song.artist}</p>}
          </div>
          <div className="flex shrink-0 rounded-lg bg-stage-fg/10 p-0.5 text-sm font-medium" role="radiogroup" aria-label="Chế độ xem">
            {(["scroll", "pages"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={prefs.mode === m}
                onClick={() => switchMode(m)}
                title={m === "scroll" ? "Tự cuộn liên tục" : "Xem như quyển sách, lật trang"}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  prefs.mode === m ? "bg-primary text-primary-foreground" : "text-stage-fg/70 hover:text-stage-fg",
                )}
              >
                {m === "scroll" ? "Cuộn" : "Sách"}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-0.5 md:flex">{tools}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBars(true)}
            title="Ẩn thanh điều khiển để có thêm chỗ đọc"
            className="shrink-0 gap-1.5 text-stage-fg hover:bg-stage-fg/10 hover:text-stage-fg"
          >
            <EyeOff />
            <span className="hidden lg:inline">Ẩn thanh</span>
          </Button>
        </header>
      )}

      {/* ===== vùng nội dung ===== */}
      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={onTap}>
        {isScroll ? (
          <>
            <div
              ref={scrollRef}
              onScroll={onScrollProgress}
              className="h-full overflow-y-auto overscroll-contain [scrollbar-width:thin]"
            >
              <div className="pt-8 pb-[70vh] sm:pt-10">
                <StageContent song={song} scale={prefs.fontScale} colored={prefs.colored} />
              </div>
            </div>
            {/* vạch đọc */}
            <div
              className="pointer-events-none absolute inset-x-0 flex items-center"
              style={{ top: `${READ_LINE * 100}%` }}
              aria-hidden
            >
              <div className="h-0 w-3 border-t-[6px] border-r-0 border-b-[6px] border-l-[10px] border-t-transparent border-b-transparent border-l-primary/70" />
              <div className="h-px flex-1 bg-primary/15" />
            </div>
          </>
        ) : (
          <BookView
            song={song}
            scale={prefs.fontScale}
            colored={prefs.colored}
            first={first}
            columns={prefs.columns}
            turnBy={prefs.turnBy}
            onLayout={onBookLayout}
            onStep={onBookStep}
          />
        )}

        {/* đếm ngược */}
        <AnimatePresence>
          {countdown !== null && countdown > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-stage-bg/60 backdrop-blur-sm"
            >
              <SlidingNumber number={countdown} className="font-display text-[9rem] leading-none font-bold text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* khi đã ẩn thanh: luôn có nút nổi để hiện lại + nút chạy/dừng nhỏ */}
        {barsHidden && (
          <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 z-30 flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={playing ? "Dừng" : "Chạy"}
              className="flex size-10 items-center justify-center rounded-full bg-stage-fg/10 text-stage-fg backdrop-blur hover:bg-stage-fg/20"
            >
              {playing || countdown !== null ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBars(false);
              }}
              className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/20"
            >
              <Eye className="size-4" /> Hiện điều khiển
            </button>
          </div>
        )}
      </div>

      {/* ===== footer (cố định, không tự ẩn) ===== */}
      {!barsHidden && (
        <footer className="relative z-20 shrink-0 border-t border-stage-fg/10 bg-stage-bg px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)]">
          {/* công cụ trên điện thoại / tablet dọc */}
          <div className="mb-2 flex items-center justify-center gap-0.5 md:hidden">{tools}</div>

          <div className="mx-auto flex max-w-4xl items-center gap-2 sm:gap-3">
            {/* thời lượng bài => tốc độ */}
            <div className="flex items-center gap-1 rounded-xl bg-stage-fg/10 p-1" title="Thời lượng cả bài — quyết định tốc độ cuộn / lật">
              <IconBtn label="Nhanh hơn (bớt 5 giây)" onClick={() => adjustDuration(-5)} className="size-8 sm:size-9">
                <Minus />
              </IconBtn>
              <div className="w-12 text-center leading-tight sm:w-14">
                <div className="font-mono text-base font-semibold tabular-nums">{formatDuration(prefs.durationSec)}</div>
                <div className="text-[10px] whitespace-nowrap text-stage-lyric">thời lượng</div>
              </div>
              <IconBtn label="Chậm hơn (thêm 5 giây)" onClick={() => adjustDuration(5)} className="size-8 sm:size-9">
                <Plus />
              </IconBtn>
            </div>

            <div className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
              <IconBtn
                label={isScroll ? "Tua lại một đoạn" : "Trang trước"}
                onClick={() => (isScroll ? scrollBack() : goPrev())}
                className="size-10 sm:size-11"
              >
                {isScroll ? <RotateCcw /> : <ChevronLeft className="size-6" />}
              </IconBtn>
              <AnimatedButton
                aria-label={playing ? "Dừng" : isScroll ? "Bắt đầu tự cuộn" : "Bắt đầu tự lật"}
                title={playing ? "Dừng" : isScroll ? "Bắt đầu tự cuộn" : "Bắt đầu tự lật trang"}
                onClick={togglePlay}
                className="size-14 rounded-full shadow-lg shadow-primary/30 sm:size-16 [&_svg:not([class*='size-'])]:size-7"
              >
                {playing || countdown !== null ? <Pause /> : <Play className="translate-x-0.5" />}
              </AnimatedButton>
              {!isScroll && (
                <IconBtn label="Trang sau" onClick={goNext} className="size-10 sm:size-11">
                  <ChevronRight className="size-6" />
                </IconBtn>
              )}
            </div>

            <div className="min-w-14 shrink-0 text-right text-sm">
              {isScroll ? (
                <span className="font-mono tabular-nums text-stage-lyric">{Math.round(progress * 100)}%</span>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono whitespace-nowrap tabular-nums">
                    {first + 1}
                    {cols > 1 && pageCount > 1 ? `–${Math.min(first + cols, pageCount)}` : ""} / {pageCount}
                  </span>
                  <div className="hidden sm:block">
                    <BookSettings
                      columns={prefs.columns}
                      autoCols={cols}
                      turnBy={prefs.turnBy}
                      onColumns={(c) => update({ columns: c })}
                      onTurnBy={(t) => update({ turnBy: t })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* gợi ý thao tác cho người mới */}
          <p className="mt-2 hidden text-center text-[11px] text-stage-lyric lg:block">
            {isScroll
              ? `Chạm vào bản nhạc hoặc bấm Space để chạy / dừng · ${prevKey} tua lại · lăn chuột để cuộn tay`
              : `Lật trang: ${nextKey} / ${prevKey}, lăn chuột, vuốt hoặc chạm mép phải / trái · Space: tự lật`}
          </p>
        </footer>
      )}

      <KeyMapDialog
        open={keyDialog}
        onOpenChange={setKeyDialog}
        keymap={keymap}
        onChange={(m) => {
          setKeymap(m);
          saveKeyMap(m);
        }}
        countdown={countdownSec}
        onCountdown={(n) => {
          setCountdownSec(n);
          writePref("gm:countdown", { n });
        }}
      />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn("text-stage-fg hover:bg-stage-fg/10 hover:text-stage-fg", active && "text-primary", className)}
    >
      {children}
    </Button>
  );
}
