import { Moon, Sun } from "lucide-react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { Popover } from "@astryxdesign/core/Popover";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { usePalette, useTheme, type ThemePref } from "@/hooks/useTheme";
import { APP_THEMES, type AppThemeId } from "@/theme/gangTheme";

const MODES: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo máy" },
];

/** "Giao diện" button: light / dark / system + the Astryx theme (Neutral, Matcha…), kept per browser */
export function ThemeToggle() {
  const { pref, resolved, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  return (
    <Popover
      label="Giao diện"
      placement="below"
      alignment="end"
      width={320}
      content={
        <div className="space-y-4">
          <div className="space-y-2">
            <Text type="label" weight="semibold" display="block">
              Chế độ
            </Text>
            <SegmentedControl label="Chế độ sáng tối" layout="fill" size="sm" value={pref} onChange={(v) => setTheme(v as ThemePref)}>
              {MODES.map((m) => (
                <SegmentedControlItem key={m.value} value={m.value} label={m.label} />
              ))}
            </SegmentedControl>
          </div>
          <div className="space-y-2">
            <Text type="label" weight="semibold" display="block">
              Màu giao diện
            </Text>
            <div className="overflow-hidden rounded-lg border border-border">
              <List density="compact" hasDividers>
                {(Object.keys(APP_THEMES) as AppThemeId[]).map((id) => {
                  const t = APP_THEMES[id];
                  return (
                    <ListItem
                      key={id}
                      label={t.label}
                      description={t.hint}
                      isSelected={palette === id}
                      onClick={() => setPalette(id)}
                      startContent={
                        <span
                          aria-hidden
                          className="size-6 shrink-0 rounded-full border border-border"
                          style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }}
                        />
                      }
                      endContent={palette === id ? <Icon icon="check" size="sm" /> : undefined}
                    />
                  );
                })}
              </List>
            </div>
          </div>
        </div>
      }
    >
      <IconButton variant="ghost" label="Giao diện" tooltip="Giao diện: sáng tối, màu" icon={<Icon icon={resolved === "dark" ? Moon : Sun} />} />
    </Popover>
  );
}

