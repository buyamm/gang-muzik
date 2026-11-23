import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
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
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { Theme } from "@astryxdesign/core/theme";
import { useAppTheme } from "@/theme/AppTheme";
import { readScalarPref, writePref } from "@/lib/prefs";
import { transposeBadge } from "@/lib/notation/transpose";
import { cn } from "@/lib/utils";
import { BookLayoutPanel, type BookLayoutPanelProps } from "./BookSettings";
import { MetronomeControls, type MetronomeControlsProps } from "./MetronomePanel";
import { TransposePanel, type TransposePanelProps } from "./TransposeSettings";

/** keyboard shortcut that toggles the settings drawer */
export const SETTINGS_SHORTCUT = "s";

/** which settings pane is open (shared by all songs) */
const PANE_KEY = "gm:settings-pane";
type PaneId = "instrument" | "display" | "practice" | "device";
const isPaneId = (v: unknown): v is PaneId => v === "instrument" || v === "display" || v === "practice" || v === "device";

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
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [pane, setPaneState] = useState<PaneId>(() => readScalarPref(PANE_KEY, "instrument", isPaneId));
  // phones: master→detail drill-down (template "settings-sidebar"); wider screens show both side by side
  const [mobileView, setMobileView] = useState<"nav" | "detail">("nav");
  const setPane = (id: PaneId) => {
    setPaneState(id);
    writePref(PANE_KEY, id);
    setMobileView("detail");
  };

  // opening another dialog from the drawer: close the drawer first so that dialog owns focus
  const openDialog = (show: () => void) => {
    onOpenChange(false);
    show();
  };

  const appTheme = useAppTheme();
  const badge = transpose ? transposeBadge(transpose.value) : null;
  const { audio: stageAudio } = audio;

  const panes: { id: PaneId; label: string; icon: LucideIcon; status?: ReactNode; hidden?: boolean }[] = [
    { id: "instrument", label: "Nhạc cụ", icon: Music2, status: badge ? <Badge label={badge} /> : undefined, hidden: !transpose && !fingering },
    { id: "display", label: "Hiển thị", icon: Type },
    {
      id: "practice",
      label: "Nhịp & drone",
      icon: MetronomeIcon,
      status: stageAudio.active ? <Badge variant="success" label={`${stageAudio.bpm} BPM`} /> : undefined,
    },
    { id: "device", label: "Thiết bị", icon: Keyboard },
  ];
  const visible = panes.filter((p) => !p.hidden);
  const current = visible.find((p) => p.id === pane) ?? visible[0];

  const navList = (
    <VStack gap={2}>
      <List density="spacious">
        {visible.map((p) => (
          <ListItem
            key={p.id}
            label={p.label}
            startContent={<Icon icon={p.icon} />}
            endContent={
              <span className="flex items-center gap-2">
                {p.status}
                {isNarrow && <Icon icon={ChevronRight} size="sm" color="secondary" />}
              </span>
            }
            isSelected={!isNarrow && current.id === p.id}
            aria-current={!isNarrow && current.id === p.id ? "page" : undefined}
            onClick={() => setPane(p.id)}
          />
        ))}
      </List>
      <Text type="supporting" color="secondary">
        <span className="block px-3">
          Bấm <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">S</kbd> để mở / đóng nhanh
        </span>
      </Text>
    </VStack>
  );

  const detail = (
    <VStack gap={6}>
      {current.id === "instrument" && (
        <>
          {fingering && (
            <Card padding={0}>
              <List>
                <SwitchRow
                  icon={Hand}
                  label="Thế bấm"
                  description="Chạm vào nốt để xem cách bấm"
                  checked={fingering.on}
                  onCheckedChange={fingering.onToggle}
                />
              </List>
            </Card>
          )}
          {transpose && <TransposePanel {...transpose} />}
        </>
      )}
      {current.id === "display" && (
        <>
          <Card padding={0}>
            <List hasDividers>
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
                <SegmentedControl label="Nền" size="sm" value={stageTheme} onChange={(v) => onStageTheme(v as "dark" | "light")}>
                  <SegmentedControlItem value="light" label="Sáng" />
                  <SegmentedControlItem value="dark" label="Tối" />
                </SegmentedControl>
              </Row>
              <ActionRow
                icon={StickyNote}
                label="Ghi chú"
                description="Ghi chú của tác giả và của riêng bạn"
                trailing={notes.has ? <Badge label={notes.visible ? "Đang hiện" : "Đang ẩn"} /> : undefined}
                onClick={() => openDialog(notes.onOpen)}
              />
            </List>
          </Card>
          {book && (
            <VStack gap={3}>
              <Heading level={3}>Kiểu sách</Heading>
              <BookLayoutPanel {...book} />
            </VStack>
          )}
        </>
      )}
      {current.id === "practice" && <MetronomeControls {...audio} />}
      {current.id === "device" && (
        <Card padding={0}>
          <List hasDividers>
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
          </List>
        </Card>
      )}
    </VStack>
  );

  const showNavOnly = isNarrow && mobileView === "nav";
  return (
    // the drawer follows the Stage background, not the site theme
    <Theme theme={appTheme} mode={stageTheme}>
      <Drawer
        isOpen={open}
        onOpenChange={(o) => {
          if (!o) setMobileView("nav");
          onOpenChange(o);
        }}
        label="Cài đặt"
        width={760}
        experimental={{ isFullWidthOnMobile: true }}
      >
        <Layout
          header={<DrawerHeader title="Cài đặt" onOpenChange={onOpenChange} hasDivider />}
          start={
            isNarrow ? undefined : (
              <LayoutPanel hasDivider padding={2} width={240} label="Mục cài đặt">
                {navList}
              </LayoutPanel>
            )
          }
          content={
            <LayoutContent padding={showNavOnly ? 2 : 6}>
              {showNavOnly ? (
                navList
              ) : (
                <VStack gap={4}>
                  <Toolbar
                    label={current.label}
                    gap={2}
                    startContent={
                      <>
                        {isNarrow && (
                          <Button
                            label="Về danh mục cài đặt"
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            icon={<Icon icon={ArrowLeft} size="sm" />}
                            onClick={() => setMobileView("nav")}
                          />
                        )}
                        <Heading level={2}>{current.label}</Heading>
                      </>
                    }
                  />
                  {detail}
                </VStack>
              )}
            </LayoutContent>
          }
        />
      </Drawer>
    </Theme>
  );
}

// ---------- building blocks ----------


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


