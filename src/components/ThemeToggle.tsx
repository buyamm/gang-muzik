import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={next === "light" ? "Chuyển nền sáng" : "Chuyển nền tối"}
      title={next === "light" ? "Nền sáng" : "Nền tối"}
      onClick={() => setTheme(next)}
    >
      {resolved === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
