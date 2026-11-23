import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from "react";
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
import { Button } from "@astryxdesign/core/Button";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import { gangTheme } from "@/theme/gangTheme";
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
    /** short transpose badge, e.g. "Alto", "Sáo Đô" (null = concert) */
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
    <span className="relative inline-flex shrink-0">
      <Button
        ref={ref}
        variant="ghost"
        label="Cài đặt"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        tooltip={`${label} · phím S`}
        icon={<Icon icon={Settings2} />}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Cài đặt</span>
          {badge && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 font-bold whitespace-nowrap text-primary-foreground">{badge}</span>
          )}
          {fingeringOn && (
            <span className="hidden items-center gap-0.5 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold sm:inline-flex">
              <Hand className="size-3" />
              Thế bấm
            </span>
          )}
          {audioActive && (
            <span aria-hidden className={cn("size-2 rounded-full bg-primary transition-transform duration-75", downbeat && "scale-150")} />
          )}
        </span>
      </Button>
    </span>
  );
});

export interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Stage background in use — the drawer follows it */
  stageTheme: "dark" | "light";
  onStageTheme: (t: "dark" | "light") => void;
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

  // opening another dialog from the drawer: close the drawer first so that dialog owns focus
  const openDialog = (show: () => void) => {
    onOpenChange(false);
    show();
  };

  const badge = transpose ? transposeBadge(transpose.value) : null;
  const { audio: stageAudio } = audio;

  return (
    // the drawer follows the Stage background, not the site theme
    <Theme theme={gangTheme} mode={stageTheme}>
      <Drawer isOpen={open} onOpenChange={onOpenChange} label="Cài đặt" width={400} experimental={{ isFullWidthOnMobile: true }}>
        <Layout
          header={
        <DrawerHeader
          title="Cài đặt"
          subtitle={
            <>
              Bấm <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">S</kbd> để mở / đóng nhanh
            </>
          }
          onOpenChange={onOpenChange}
          hasDivider
        />
          }
          content={
        <LayoutContent>
        <div className="space-y-6 pb-[env(safe-area-inset-bottom)]">
          {(transpose || fingering) && (
            <Section title="Nhạc cụ">
              {transpose && (
                <Disclosure
                  icon={Music2}
                  label="Giọng nhạc cụ"
                  description="Dịch cảm âm & hợp âm sang giọng nhạc cụ của bạn — sax hoặc sáo"
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
              <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                <IconButton variant="ghost" size="sm" label="Thu nhỏ" icon={<Icon icon={Minus} />} onClick={onZoomOut} isDisabled={fontScale <= 0.6} />
                <span className="w-11 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {Math.round(fontScale * 100)}%
                </span>
                <IconButton variant="ghost" size="sm" label="Phóng to" icon={<Icon icon={Plus} />} onClick={onZoomIn} isDisabled={fontScale >= 3} />
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
        </LayoutContent>
          }
        />
      </Drawer>
    </Theme>
  );
}

// ---------- building blocks ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <Text type="supporting" color="secondary" weight="semibold" id={id} display="block">
        <span className="px-1 tracking-wider uppercase">{title}</span>
      </Text>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <List hasDividers density="balanced">
          {children}
        </List>
      </div>
    </section>
  );
}

function Chip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function RowIcon({ icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
      <Icon icon={icon} size="sm" />
    </span>
  );
}

/** full-text description (ListItem cuts plain strings to one line) */
const desc = (text: string) => <span className="block text-xs leading-snug text-muted-foreground">{text}</span>;

/** icon + label + description, with a control on the right */
function Row({ icon, label, description, children }: { icon: LucideIcon; label: string; description: string; children: ReactNode }) {
  return <ListItem startContent={<RowIcon icon={icon} />} label={label} description={desc(description)} endContent={children} />;
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
  const ref = useRef<HTMLInputElement>(null);
  return (
    <ListItem
      startContent={<RowIcon icon={icon} />}
      label={label}
      description={desc(description)}
      interactiveRef={ref}
      endContent={<Switch ref={ref} label={label} isLabelHidden value={checked} onChange={(v) => onCheckedChange(v)} />}
    />
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
    <ListItem
      startContent={<RowIcon icon={icon} />}
      label={label}
      description={desc(description)}
      onClick={onClick}
      endContent={
        <span className="flex items-center gap-2">
          {trailing}
          <Icon icon={ChevronRight} size="sm" color="secondary" />
        </span>
      }
    />
  );
}

/** a row whose controls always show underneath */
function Block({ icon, label, description, children }: { icon: LucideIcon; label: string; description: string; children: ReactNode }) {
  return (
    <>
      <ListItem startContent={<RowIcon icon={icon} />} label={label} description={desc(description)} />
      <div className="px-3 pb-4">{children}</div>
    </>
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
    <>
      <ListItem
        startContent={<RowIcon icon={icon} />}
        label={label}
        description={desc(description)}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        endContent={
          <span className="flex items-center gap-2">
            {summary}
            <Icon icon={ChevronDown} size="sm" color="secondary" className={cn("transition-transform", open && "rotate-180")} />
          </span>
        }
      />
      {open && (
        <div id={panelId} className="border-t border-dashed border-border px-3 pt-3 pb-4">
          {children}
        </div>
      )}
    </>
  );
}
