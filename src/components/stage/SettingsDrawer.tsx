import { forwardRef, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Hand,
  Keyboard,
  Maximize,
  Metronome as MetronomeIcon,
  Minus,
  Moon,
  Music2,
  Palette,
  Plus,
  Save,
  Settings2,
  StickyNote,
  Sun,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/animate-ui/components/radix/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { readPref, writePref } from "@/lib/prefs";
import { transposeBadge } from "@/lib/notation/transpose";
import { cn } from "@/lib/utils";
import { BookLayoutPanel, Choice, type BookLayoutPanelProps } from "./BookSettings";
import { MetronomeControls, type MetronomeControlsProps } from "./MetronomePanel";
import { TransposePanel, type TransposePanelProps } from "./TransposeSettings";

/** keyboard shortcut that toggles the settings drawer */
export const SETTINGS_SHORTCUT = "s";

/** which collapsible blocks of the drawer are expanded (shared by all songs) */
const EXPANDED_KEY = "gm:settings-expanded";
type BlockId = "transpose" | "audio";
const EXPANDED_DEFAULT: Record<BlockId, boolean> = { transpose: true, audio: false };

const isTypingTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

/**
 * Toggle the drawer with the `S` key. Skipped while typing, with modifiers, when disabled
 * (another dialog is open) or when the user mapped `S` to a pedal action.
 */
export function useSettingsShortcut(toggle: () => void, enabled: boolean, reservedKeys: string[] = []) {
  const ref = useRef(toggle);
  ref.current = toggle;
  const reserved = reservedKeys.some((k) => k.toLowerCase() === SETTINGS_SHORTCUT);
  useEffect(() => {
    if (!enabled || reserved) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== SETTINGS_SHORTCUT) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, reserved]);
}

/** labelled "Cài đặt" header button with small status chips */
export const SettingsButton = forwardRef<
  HTMLButtonElement,
  {
    open: boolean;
    onClick: () => void;
    /** short transpose badge, e.g. "Alto" (null = concert) */
    badge?: string | null;
    /** metronome or drone is playing */
    audioActive?: boolean;
    /** pulse the audio dot on the downbeat */
    downbeat?: boolean;
    fingeringOn?: boolean;
  }
>(function SettingsButton({ open, onClick, badge, audioActive, downbeat, fingeringOn }, ref) {
  const status = [badge && `giọng ${badge}`, audioActive && "nhịp đang phát", fingeringOn && "thế bấm đang bật"].filter(Boolean);
  const label = status.length ? `Cài đặt (${status.join(", ")})` : "Cài đặt";
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={`${label} · phím S`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 gap-1.5 px-2 text-stage-fg hover:bg-stage-fg/10 hover:text-stage-fg sm:px-3"
    >
      <Settings2 />
      <span className="hidden sm:inline">Cài đặt</span>
      {badge && (
        <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 font-bold text-primary-foreground">{badge}</span>
      )}
      {fingeringOn && (
        <span className="hidden items-center gap-0.5 rounded-full bg-stage-fg/10 px-1.5 text-[10px] leading-4 font-semibold sm:inline-flex">
          <Hand className="size-3" />
          Thế bấm
        </span>
      )}
      {audioActive && (
        <span
          aria-hidden
          className={cn("size-2 rounded-full bg-primary transition-transform duration-75", downbeat && "scale-150")}
        />
      )}
    </Button>
  );
});

export interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Stage background in use — the drawer follows it */
  stageTheme: "dark" | "light";
  onStageTheme: (t: "dark" | "light") => void;
  /** where focus goes back when the drawer closes (the header button) */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** transpose controls; omitted when the song has neither text notation nor a key */
  transpose?: Omit<TransposePanelProps, "className">;
  /** fingering lookup switch; omitted when the song has no cảm âm notes */
  fingering?: { on: boolean; onToggle: () => void };
  fontScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** note colours switch; omitted for image-only songs */
  colored?: { on: boolean; onToggle: () => void };
  notes: { has: boolean; visible: boolean; onOpen: () => void };
  /** book layout controls (book mode only) */
  book?: Omit<BookLayoutPanelProps, "className">;
  audio: Omit<MetronomeControlsProps, "className">;
  onOpenKeyMap: () => void;
  fullscreen?: { isFull: boolean; onToggle: () => void };
  /** Studio only: store the current view as the song defaults */
  onSaveDefaults?: () => void;
}

/** right-side drawer gathering every Stage setting, grouped and labelled */
export function SettingsDrawer({
  open,
  onOpenChange,
  stageTheme,
  onStageTheme,
  returnFocusRef,
  transpose,
  fingering,
  fontScale,
  onZoomIn,
  onZoomOut,
  colored,
  notes,
  book,
  audio,
  onOpenKeyMap,
  fullscreen,
  onSaveDefaults,
}: SettingsDrawerProps) {
  const [expanded, setExpanded] = useState(() => ({ ...EXPANDED_DEFAULT, ...readPref(EXPANDED_KEY, EXPANDED_DEFAULT) }));
  const toggleBlock = (id: BlockId) =>
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writePref(EXPANDED_KEY, next);
      return next;
    });

  // opening another dialog from the drawer: let that dialog own focus instead of the header button
  const handoff = useRef(false);
  const openDialog = (show: () => void) => {
    handoff.current = true;
    onOpenChange(false);
    show();
  };

  const badge = transpose ? transposeBadge(transpose.value) : null;
  const { audio: stageAudio } = audio;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={cn(
          "w-[min(92vw,400px)] gap-0 bg-background text-foreground",
          stageTheme === "dark" && "dark",
        )}
        onCloseAutoFocus={(e) => {
          if (handoff.current) {
            handoff.current = false;
            e.preventDefault();
            return;
          }
          if (returnFocusRef?.current) {
            e.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <SheetHeader className="gap-0.5 border-b px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <Settings2 className="size-5 text-primary" />
            Cài đặt
          </SheetTitle>
          <SheetDescription className="text-xs">
            Bấm <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">S</kbd> để mở / đóng nhanh
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] [scrollbar-width:thin]">
          {(transpose || fingering) && (
            <Section title="Nhạc cụ">
              {transpose && (
                <Disclosure
                  icon={Music2}
                  label="Giọng kèn"
                  description="Dịch cảm âm & hợp âm sang giọng nhạc cụ của bạn"
                  summary={<Chip active={!!badge}>{badge ?? "Concert"}</Chip>}
                  open={expanded.transpose}
                  onToggle={() => toggleBlock("transpose")}
                >
                  <TransposePanel {...transpose} />
                </Disclosure>
              )}
              {fingering && (
                <SwitchRow
                  icon={Hand}
                  label="Thế bấm"
                  description="Chạm vào nốt để xem cách bấm"
                  checked={fingering.on}
                  onCheckedChange={fingering.onToggle}
                />
              )}
            </Section>
          )}

          <Section title="Hiển thị">
            <Row icon={Type} label="Cỡ chữ" description="Phóng to / thu nhỏ bản nhạc">
              <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Thu nhỏ" onClick={onZoomOut} disabled={fontScale <= 0.6}>
                  <Minus />
                </Button>
                <span className="w-11 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {Math.round(fontScale * 100)}%
                </span>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Phóng to" onClick={onZoomIn} disabled={fontScale >= 3}>
                  <Plus />
                </Button>
              </div>
            </Row>
            {colored && (
              <SwitchRow
                icon={Palette}
                label="Tô màu nốt"
                description="Mỗi nốt Đô, Rê, Mi… một màu"
                checked={colored.on}
                onCheckedChange={colored.onToggle}
              />
            )}
            <Row icon={stageTheme === "dark" ? Moon : Sun} label="Nền" description="Sáng khi đọc ngoài trời, tối khi diễn">
              <div className="flex w-32 gap-1" role="group" aria-label="Nền">
                <Choice active={stageTheme === "light"} onClick={() => onStageTheme("light")}>
                  Sáng
                </Choice>
                <Choice active={stageTheme === "dark"} onClick={() => onStageTheme("dark")}>
                  Tối
                </Choice>
              </div>
            </Row>
            <ActionRow
              icon={StickyNote}
              label="Ghi chú"
              description="Ghi chú của tác giả và của riêng bạn"
              trailing={notes.has ? <Chip active={notes.visible}>{notes.visible ? "Đang hiện" : "Đang ẩn"}</Chip> : undefined}
              onClick={() => openDialog(notes.onOpen)}
            />
            {book && (
              <Block icon={BookOpen} label="Kiểu sách" description="Số trang trên màn hình và cách lật">
                <BookLayoutPanel {...book} />
              </Block>
            )}
          </Section>

          <Section title="Luyện tập">
            <Disclosure
              icon={MetronomeIcon}
              label="Nhịp & drone"
              description="Máy đếm nhịp và nốt nền để tập"
              summary={
                <Chip active={stageAudio.active}>
                  {stageAudio.active && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
                  {stageAudio.bpm} BPM
                </Chip>
              }
              open={expanded.audio}
              onToggle={() => toggleBlock("audio")}
            >
              <MetronomeControls {...audio} />
            </Disclosure>
          </Section>

          <Section title="Thiết bị">
            <ActionRow
              icon={Keyboard}
              label="Pedal & phím tắt"
              description="Gán pedal Bluetooth, đếm ngược trước khi chạy"
              onClick={() => openDialog(onOpenKeyMap)}
            />
            {fullscreen && (
              <SwitchRow
                icon={Maximize}
                label="Toàn màn hình"
                description="Ẩn thanh trình duyệt để có thêm chỗ đọc"
                checked={fullscreen.isFull}
                onCheckedChange={fullscreen.onToggle}
              />
            )}
            {onSaveDefaults && (
              <ActionRow
                icon={Save}
                label="Lưu làm mặc định"
                description="Chế độ, cỡ chữ, thời lượng và nhịp độ hiện tại thành mặc định của bài"
                onClick={onSaveDefaults}
              />
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------- building blocks ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  );
}

function Chip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function RowText({ icon: Icon, label, description, labelId }: { icon: LucideIcon; label: string; description: string; labelId?: string }) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span id={labelId} className="block text-sm leading-tight font-medium">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
      </span>
    </>
  );
}

/** icon + label + description, with a control on the right */
function Row({ icon, label, description, children }: { icon: LucideIcon; label: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <RowText icon={icon} label={label} description={description} />
      {children}
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50">
      <RowText icon={icon} label={label} description={description} />
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function ActionRow({
  icon,
  label,
  description,
  trailing,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      <RowText icon={icon} label={label} description={description} />
      {trailing}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/** a row whose controls always show underneath */
function Block({ icon, label, description, children }: { icon: LucideIcon; label: string; description: string; children: ReactNode }) {
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        <RowText icon={icon} label={label} description={description} />
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** a row that expands its controls inline */
function Disclosure({
  icon,
  label,
  description,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        <RowText icon={icon} label={label} description={description} />
        {summary}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panelId} className="border-t border-dashed px-3 pt-3 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
