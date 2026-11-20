import { Link, NavLink } from "react-router";
import { AudioLines, Hand, LibraryBig, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/Staff";
import { STUDIO_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

export interface SiteNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** match the path exactly (needed for "/") */
  end?: boolean;
}

/** Main sections of the public site, in nav order */
export const SITE_NAV: SiteNavItem[] = [
  { to: "/", label: "Thư viện", icon: LibraryBig, end: true },
  { to: "/fingering", label: "Thế bấm", icon: Hand },
  { to: "/practice", label: "Luyện gam", icon: AudioLines },
];

/**
 * Shared header of the public site: logo · nav · contribute · theme.
 * On phones the nav drops to its own horizontally scrollable row.
 * `className` styles the outer <header>, `containerClassName` the inner width container (default max-w-6xl).
 */
export function SiteHeader({ className, containerClassName }: { className?: string; containerClassName?: string }) {
  return (
    <header className={className}>
      <div className={cn("mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 sm:flex-nowrap sm:px-6", containerClassName)}>
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-lg font-display text-base font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <LogoMark className="size-7" />
          Gang Muzik
        </Link>

        <div className="ml-auto flex items-center sm:order-3 sm:ml-0">
          <Button asChild variant="ghost" size="sm" title="Đăng nhập bằng Google để gửi bài của bạn">
            <a href={STUDIO_URL}>
              <PenLine /> <span className="hidden sm:inline">Đóng góp bài</span>
              <span className="sr-only sm:hidden">Đóng góp bài</span>
            </a>
          </Button>
          <ThemeToggle />
        </div>

        <nav
          aria-label="Chính"
          className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:order-2 sm:mx-0 sm:ml-4 sm:w-auto sm:flex-1 sm:px-0"
        >
          <ul className="flex w-max gap-1">
            {SITE_NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
