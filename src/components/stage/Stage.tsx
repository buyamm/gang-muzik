import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { Song, SongSettings, ViewMode } from "@shared/types";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { useToast } from "@astryxdesign/core/Toast";
import { useFullscreen } from "@/hooks/useFullscreen";
import { keyLabel, loadKeyMap, saveKeyMap, usePedalKeys, type KeyMap, type PedalAction } from "@/hooks/usePedalKeys";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { formatDuration, speedFromDuration } from "@/lib/stage/math";
import { readPref, removePref, writePref } from "@/lib/prefs";
import { instrumentForPreset, readLearnInstrument } from "@/lib/learnInstrument";
import { cn } from "@/lib/utils";
import { parseNotation } from "@/lib/notation/parse";
import { bestOctave, rangeFor, resolveShift, summarizeRange } from "@/lib/notation/range";
import {
  formatKeyName,
  hornPreset,
  keyMajorPc,
  keyRootPc,
  normalizeTranspose,
  NO_TRANSPOSE,
  transposeBadge,
  transposeKeyName,
  type NoteValue,
  type TransposeSetting,
} from "@/lib/notation/transpose";
import { BookView, type ColumnsPref } from "./BookView";
import { KeyMapDialog } from "./KeyMapDialog";
import { FingeringChartDialog, FingeringPopover, fingeringTarget, type FingeringTarget } from "./FingeringPopover";
import { DEFAULT_BPM, useStageAudio } from "./MetronomePanel";
import { SettingsButton, SettingsDrawer, useSettingsShortcut } from "./SettingsDrawer";
import { NotesDialog, usePersonalNote, type NotesData } from "./SongNotes";
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
  /** hiện khung ghi chú trên đầu bài */
  showNotes: boolean;
  /** dịch giọng cho nhạc cụ (Bb, Eb...) — chỉ áp dụng nhạc dạng chữ */
  transpose: TransposeSetting;
  /** máy đếm nhịp: nhịp độ + số phách mỗi ô nhịp */
  bpm: number;
  beatsPerBar: number;
}

/** giọng kèn chọn gần nhất — bài mới mở lần đầu dùng luôn giọng này */
const TRANSPOSE_KEY = "gm:transpose";
/** fingering mode (tap a note to see its sax fingering), shared by all songs */
const FINGERING_KEY = "gm:fingering";
const FINGERING_DEFAULT = { on: false, hinted: false };

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
    showNotes: true,
    transpose: normalizeTranspose(readPref<Partial<TransposeSetting>>(TRANSPOSE_KEY, NO_TRANSPOSE)),
    bpm: s.bpm ?? DEFAULT_BPM,
    beatsPerBar: 4,
  };
}

export function Stage({
  song,
  canSaveDefaults = false,
  onSaveDefaults,
  backTo = "/",
  onBack,
  persist = true,
}: {
  song: Song;
  /** Studio: chủ bài / admin lưu cài đặt hiện tại làm mặc định */
  canSaveDefaults?: boolean;
  onSaveDefaults?: (s: SongSettings) => Promise<unknown>;
  /** Studio: nút quay lại trỏ về trình sửa thay vì thư viện */
  backTo?: string;
  /** Studio xem trước: nút quay lại gọi hàm này thay vì điều hướng */
  onBack?: () => void;
  /** false = không đọc/ghi cài đặt riêng của bài (gm:song:id) — xem trước bản chưa lưu luôn theo form */
  persist?: boolean;
}) {
  const prefKey = `gm:song:${song.id}`;
  const defaults = useMemo(() => defaultsFor(song), [song]);
  const [prefs, setPrefs] = useState<ViewPrefs>(() => (persist ? readPref(prefKey, defaults) : defaults));
  const update = useCallback(
    (patch: Partial<ViewPrefs>) =>
      setPrefs((p) => {
        const next = { ...p, ...patch };
        if (persist) writePref(prefKey, next);
        return next;
      }),
    [prefKey, persist],
  );

  const [playing, setPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownSec, setCountdownSec] = useState(() => readPref("gm:countdown", { n: 3 }).n);
  const [keymap, setKeymap] = useState<KeyMap>(loadKeyMap);
  const [keyDialog, setKeyDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  // stored values may be legacy / malformed: always normalize before use
  const transpose = useMemo(() => normalizeTranspose(prefs.transpose), [prefs.transpose]);
  const changeTranspose = (t: TransposeSetting) => {
    update({ transpose: t });
    writePref(TRANSPOSE_KEY, t);
  };
  const sections = useMemo(() => parseNotation(song.textContent), [song.textContent]);
  // auto octave, spelling and horn range for this song
  // the stored song key (if valid) decides accidental spelling before the first-chord guess
  const songKey = keyMajorPc(song.settings.key) !== null ? song.settings.key : undefined;
  const shift = useMemo(
    () => resolveShift(transpose, sections, keyMajorPc(songKey) ?? undefined),
    [transpose, sections, songKey],
  );
  const rangeSummary = useMemo(() => summarizeRange(sections, shift), [sections, shift]);
  const autoOctaveValue = useMemo(
    () => {
      const range = rangeFor(transpose.preset);
      return range ? bestOctave(sections, transpose.semitones, range) : undefined;
    },
    [sections, transpose.preset, transpose.semitones],
  );
  const horn = useMemo(() => {
    if (!shift || shift.semitones % 12 === 0) return undefined;
    const name = hornPreset(shift.preset)?.name ?? `nhạc cụ (${shift.semitones > 0 ? "+" : "−"}${Math.abs(shift.semitones)})`;
    return { label: name, semitones: shift.semitones, spelling: shift.spelling };
  }, [shift]);
  // ---------- fingering lookup ----------
  const hasNoteRows = useMemo(
    () => sections.some((sec) => sec.rows.some((r) => r.notes?.some((t) => t.type === "note"))),
    [sections],
  );
  const [fingeringPref, setFingeringPref] = useState(() => readPref(FINGERING_KEY, FINGERING_DEFAULT));
  const fingeringOn = hasNoteRows && fingeringPref.on;
  // sax / sáo presets pick their own diagram; concert and custom use the stored learning instrument
  const [learnInstrument] = useState(readLearnInstrument);
  const fingeringInstrument = instrumentForPreset(transpose.preset, learnInstrument);
  const [fingerTarget, setFingerTarget] = useState<FingeringTarget | null>(null);
  const [fingerOpen, setFingerOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartHighlight, setChartHighlight] = useState<number | null>(null);
  const showToast = useToast();
  const toggleFingering = () => {
    const next = { on: !fingeringPref.on, hinted: true };
    if (next.on && !fingeringPref.hinted) showToast({ body: "Chạm vào nốt để xem thế bấm" });
    if (!next.on) {
      setFingerOpen(false);
      setChartOpen(false);
    }
    setFingeringPref(next);
    writePref(FINGERING_KEY, next);
  };
  const onNoteClick = useCallback((written: NoteValue, concert: NoteValue, el: HTMLElement) => {
    setFingerTarget(fingeringTarget(written, concert, el));
    setFingerOpen(true);
  }, []);
  // a tap that only dismisses the popover must not also start playback / turn the page
  const fingerDismissedAt = useRef(0);
  const onFingerOutside = useCallback(() => {
    fingerDismissedAt.current = performance.now();
  }, []);
  const openChart = useCallback((semi: number | null) => {
    setFingerOpen(false);
    setChartHighlight(semi);
    setChartOpen(true);
  }, []);
  const [personalNote, setPersonalNote] = usePersonalNote(song.id);
  const authorNote = song.note ?? "";
  const hasNotes = !!(authorNote.trim() || personalNote);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const toggleNotes = useCallback(() => setNotesExpanded((v) => !v), []);
  const notes = useMemo<NotesData | null>(
    () =>
      prefs.showNotes && hasNotes
        ? { author: authorNote, personal: personalNote, expanded: notesExpanded, onToggle: toggleNotes }
        : null,
    [prefs.showNotes, hasNotes, authorNote, personalNote, notesExpanded, toggleNotes],
  );
  // chỉ ẩn thanh điều khiển khi người dùng chủ động bấm "Ẩn" — không tự ẩn/hiện
  const [barsHidden, setBarsHidden] = useState(() => readPref("gm:bars", { hidden: false }).hidden);
  const [first, setFirst] = useState(0); // trang sách đầu tiên đang hiện
  const [book, setBook] = useState({ pageCount: 1, cols: 1 });
  const [progress, setProgress] = useState(0); // 0..1 cho chế độ cuộn

  const scrollRef = useRef<HTMLDivElement>(null);
  const turnBarRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(prefs.durationSec);
  durationRef.current = prefs.durationSec;

  const audio = useStageAudio({ bpm: prefs.bpm, beatsPerBar: prefs.beatsPerBar, onChange: update, countdown });

  const fs = useFullscreen();
  useWakeLock(true);

  const isScroll = prefs.mode === "scroll";
  const site = useTheme();
  const stageTheme = prefs.theme === "auto" ? site.resolved : prefs.theme;
  const { pageCount, cols } = book;
  const stepSize = prefs.turnBy === "page" ? 1 : cols;
  const maxFirst = prefs.turnBy === "page" ? Math.max(0, pageCount - cols) : Math.floor((pageCount - 1) / cols) * cols;
  const hasText = !!song.textContent.trim();
  // "Tone Am · Alto: F♯m": the key as written for the horn, spelled like the transposed notes
  const songKeyLabel = useMemo(() => {
    if (!songKey) return null;
    const badge = transposeBadge(transpose);
    if (!badge || !shift?.semitones) return `Tone ${formatKeyName(songKey)}`;
    return `Tone ${formatKeyName(songKey)} · ${badge}: ${formatKeyName(transposeKeyName(songKey, shift.semitones, shift.spelling))}`;
  }, [songKey, transpose, shift]);
  /** chế độ sách hiện tất cả trang trên một màn hình — không có gì để lật */
  const allMode = !isScroll && prefs.columns === "all";

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
    if (allMode) return;
    if (countdown !== null) return setCountdown(null);
    if (playing) return setPlaying(false);
    if (atEnd()) {
      if (isScroll) scrollRef.current?.scrollTo({ top: 0 });
      else setFirst(0);
    }
    if (countdownSec > 0) setCountdown(countdownSec);
    else setPlaying(true);
  }, [allMode, countdown, playing, atEnd, isScroll, countdownSec]);

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
  const otherDialogOpen = keyDialog || noteDialog || fingerOpen || chartOpen;
  usePedalKeys(onPedal, keymap, !otherDialogOpen && !settingsOpen);
  useSettingsShortcut(
    () => setSettingsOpen((o) => !o),
    !otherDialogOpen,
    Object.values(keymap).flat(),
  );

  // ---------- chạm ----------
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() - fingerDismissedAt.current < 600) return;
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
      bpm: prefs.bpm,
    });
    removePref(prefKey);
  };

  const zoomOut = () => update({ fontScale: Math.max(0.6, +(prefs.fontScale - 0.1).toFixed(2)) });
  const zoomIn = () => update({ fontScale: Math.min(3, +(prefs.fontScale + 0.1).toFixed(2)) });

  const hasTranspose = hasText || !!songKey;
  const transposeChip = hasTranspose ? transposeBadge(transpose) : null;

  const nextKey = keyLabel(keymap.next[0] ?? "→");
  const prevKey = keyLabel(keymap.prev[0] ?? "←");

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col bg-stage-bg text-stage-fg",
        stageTheme === "light" ? "stage-light" : "dark",
      )}
    >
      {/* progress line at the very top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[3px] bg-stage-fg/8">
        {isScroll ? (
          <div className="h-full origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} />
        ) : (
          <div ref={turnBarRef} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
        )}
      </div>

      {/* ===== top bar (always shown unless hidden by the user) ===== */}
      {!barsHidden && (
        <header className="relative z-20 shrink-0 bg-stage-bg px-2 pt-[env(safe-area-inset-top)] sm:px-3">
          <Toolbar
            label="Bài đang xem"
            size="lg"
            gap={2}
            dividers={["bottom"]}
            startContent={
              <>
                <IconButton
                  variant="ghost"
                  label="Quay lại"
                  tooltip="Quay lại"
                  icon={<Icon icon={ArrowLeft} />}
                  {...(onBack ? { onClick: onBack } : { href: backTo })}
                />
                <VStack gap={0} className="min-w-0">
                  <Heading level={1} maxLines={1}>
                    {song.title}
                  </Heading>
                  {(song.artist || songKeyLabel) && (
                    <Text type="supporting" color="secondary" maxLines={1}>
                      {[song.artist, songKeyLabel].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </VStack>
              </>
            }
            endContent={
              <>
                <SegmentedControl label="Chế độ xem" size="sm" value={prefs.mode} onChange={(m) => switchMode(m as ViewMode)}>
                  <SegmentedControlItem value="scroll" label="Cuộn" />
                  <SegmentedControlItem value="pages" label="Sách" />
                </SegmentedControl>
                <SettingsButton
                  ref={settingsBtnRef}
                  open={settingsOpen}
                  onClick={() => setSettingsOpen(true)}
                  badge={transposeChip}
                  audioActive={audio.active}
                  downbeat={audio.metro.running && audio.metro.beat === 0}
                  fingeringOn={fingeringOn}
                />
                <IconButton
                  variant="ghost"
                  label="Ẩn thanh điều khiển"
                  tooltip="Ẩn thanh điều khiển để có thêm chỗ đọc"
                  icon={<Icon icon={EyeOff} />}
                  onClick={() => setBars(true)}
                />
              </>
            }
          />
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
                <StageContent
                  song={song}
                  scale={prefs.fontScale}
                  colored={prefs.colored}
                  notes={notes}
                  transpose={shift}
                  onNoteClick={fingeringOn ? onNoteClick : undefined}
                />
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
            notes={notes}
            transpose={shift}
            onNoteClick={fingeringOn ? onNoteClick : undefined}
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
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={countdown}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="font-display text-[9rem] leading-none font-bold text-stage-fg tabular-nums"
                >
                  {countdown}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* khi đã ẩn thanh: luôn có nút nổi để hiện lại + nút chạy/dừng nhỏ */}
        {barsHidden && (
          <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 z-30 flex gap-2">
            <IconButton
              elevation="med"
              label={playing ? "Dừng" : "Chạy"}
              icon={<Icon icon={playing || countdown !== null ? Pause : Play} />}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            />
            <Button
              variant="primary"
              elevation="med"
              label="Hiện điều khiển"
              icon={<Icon icon={Eye} />}
              onClick={(e) => {
                e.stopPropagation();
                setBars(false);
              }}
            />
          </div>
        )}
      </div>

      {/* ===== transport bar ===== */}
      {!barsHidden && (
        <footer className="relative z-20 shrink-0 bg-stage-bg px-3 pb-[env(safe-area-inset-bottom)]">
          <Toolbar
            label="Điều khiển phát"
            size="lg"
            gap={2}
            dividers={["top"]}
            startContent={
              /* song duration => speed */
              <HStack gap={1} vAlign="center" className="rounded-full border border-border p-1">
                <IconBtn label="Nhanh hơn (bớt 5 giây)" onClick={() => adjustDuration(-5)} size="sm">
                  {Minus}
                </IconBtn>
                <span className="flex w-16 flex-col items-center leading-tight whitespace-nowrap" title="Thời lượng cả bài — quyết định tốc độ cuộn / lật">
                  <Text weight="bold" hasTabularNumbers>
                    {formatDuration(prefs.durationSec)}
                  </Text>
                  <Text type="supporting" color="secondary">
                    thời lượng
                  </Text>
                </span>
                <IconBtn label="Chậm hơn (thêm 5 giây)" onClick={() => adjustDuration(5)} size="sm">
                  {Plus}
                </IconBtn>
              </HStack>
            }
            centerContent={
              allMode ? (
                <Text type="supporting" color="secondary">
                  Đang hiện cả bài — không cần lật
                </Text>
              ) : (
                <>
                  <IconBtn label={isScroll ? "Tua lại một đoạn" : "Trang trước"} onClick={() => (isScroll ? scrollBack() : goPrev())} size="lg">
                    {isScroll ? RotateCcw : ChevronLeft}
                  </IconBtn>
                  <IconButton
                    variant="primary"
                    size="lg"
                    elevation="med"
                    label={playing ? "Dừng" : isScroll ? "Bắt đầu tự cuộn" : "Bắt đầu tự lật trang"}
                    tooltip={`${playing ? "Dừng" : isScroll ? "Bắt đầu tự cuộn" : "Bắt đầu tự lật trang"} · Space`}
                    icon={<Icon icon={playing || countdown !== null ? Pause : Play} size="lg" />}
                    onClick={togglePlay}
                    className="size-14! rounded-full!"
                  />
                  {!isScroll && (
                    <IconBtn label="Trang sau" onClick={goNext} size="lg">
                      {ChevronRight}
                    </IconBtn>
                  )}
                </>
              )
            }
            endContent={
              isScroll ? (
                <div className="hidden w-36 sm:block">
                  <ProgressBar label="Đã cuộn" value={Math.round(progress * 100)} hasValueLabel isLabelHidden />
                </div>
              ) : (
                <Text weight="bold" hasTabularNumbers>
                  {allMode
                    ? `${pageCount} trang`
                    : `${first + 1}${cols > 1 && pageCount > 1 ? `–${Math.min(first + cols, pageCount)}` : ""} / ${pageCount}`}
                </Text>
              )
            }
          />
          {/* hint for newcomers */}
          <p className="hidden pb-2 text-center text-[11px] text-stage-lyric lg:block">
            {isScroll
              ? `Chạm vào bản nhạc hoặc bấm Space để chạy / dừng · ${prevKey} tua lại · lăn chuột để cuộn tay · S: cài đặt`
              : allMode
                ? "Đang hiện cả bài trên một màn hình · đổi lại trong Cài đặt › Hiển thị › Kiểu sách"
                : `Lật trang: ${nextKey} / ${prevKey}, lăn chuột, vuốt hoặc chạm mép phải / trái · Space: tự lật · S: cài đặt`}
          </p>
        </footer>
      )}

      {fingeringOn && (
        <>
          <FingeringPopover
            target={fingerTarget}
            open={fingerOpen}
            onOpenChange={setFingerOpen}
            onOpenChart={openChart}
            onPointerDownOutside={onFingerOutside}
            instrument={fingeringInstrument}
          />
          <FingeringChartDialog
            open={chartOpen}
            onOpenChange={setChartOpen}
            highlight={chartHighlight}
            instrument={fingeringInstrument}
          />
        </>
      )}
      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        stageTheme={stageTheme}
        onStageTheme={(t) => update({ theme: t })}
        transpose={
          hasTranspose
            ? {
                value: transpose,
                onChange: changeTranspose,
                autoOctaveValue,
                rangeSummary,
                notice: hasText ? undefined : "Bài dạng ảnh không dịch nốt được — chỉ hiện tone cho nhạc cụ.",
                songKey,
              }
            : undefined
        }
        fingering={hasNoteRows ? { on: fingeringOn, onToggle: toggleFingering } : undefined}
        fontScale={prefs.fontScale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        colored={hasText ? { on: prefs.colored, onToggle: () => update({ colored: !prefs.colored }) } : undefined}
        notes={{ has: hasNotes, visible: prefs.showNotes, onOpen: () => setNoteDialog(true) }}
        book={
          isScroll
            ? undefined
            : {
                columns: prefs.columns,
                autoCols: cols,
                turnBy: prefs.turnBy,
                onColumns: (c) => update({ columns: c }),
                onTurnBy: (t) => update({ turnBy: t }),
              }
        }
        audio={{ audio, horn: hasTranspose ? horn : undefined, tonicPc: keyRootPc(songKey) ?? undefined }}
        onOpenKeyMap={() => setKeyDialog(true)}
        fullscreen={fs.supported ? { isFull: fs.isFull, onToggle: fs.toggle } : undefined}
        onSaveDefaults={canSaveDefaults && onSaveDefaults ? saveDefaults : undefined}
      />
      <NotesDialog
        open={noteDialog}
        onOpenChange={setNoteDialog}
        authorNote={authorNote}
        personalNote={personalNote}
        onSavePersonal={setPersonalNote}
        visible={prefs.showNotes}
        onVisible={(v) => update({ showNotes: v })}
      />
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
  size = "md",
}: {
  label: string;
  onClick: () => void;
  /** lucide icon component */
  children: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <IconButton
      variant="ghost"
      size={size}
      label={label}
      tooltip={label}
      icon={<Icon icon={children} />}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
}
