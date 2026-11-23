import { Moon, Sun } from "lucide-react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "@astryxdesign/core/Icon";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <IconButton
      variant="ghost"
      label={next === "light" ? "Chuyển nền sáng" : "Chuyển nền tối"}
      tooltip={next === "light" ? "Nền sáng" : "Nền tối"}
      icon={<Icon icon={resolved === "dark" ? Sun : Moon} />}
      onClick={() => setTheme(next)}
    />
  );
}
