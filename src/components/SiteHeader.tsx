import { useLocation } from "react-router";
import { AudioLines, Hand, LibraryBig, PenLine, type LucideIcon } from "lucide-react";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
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

const isActive = (pathname: string, { to, end }: SiteNavItem) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

/**
 * Shared header of the public site (Astryx TopNav): logo · sections · contribute · theme.
 * On phones the section links drop to their own scrollable row under the bar.
 * `containerClassName` sets the content width (default max-w-6xl).
 */
export function SiteHeader({ className, containerClassName }: { className?: string; containerClassName?: string }) {
  const { pathname } = useLocation();
  const items = SITE_NAV.map((item) => (
    <TopNavItem
      key={item.to}
      href={item.to}
      label={item.label}
      icon={<Icon icon={item.icon} />}
      isSelected={isActive(pathname, item)}
    />
  ));
  return (
    <header className={cn("border-b border-border bg-card", className)}>
      <div className={cn("mx-auto max-w-6xl px-2 sm:px-4", containerClassName)}>
        <TopNav
          label="Chính"
          heading={<TopNavHeading logo={<LogoMark className="size-7" />} heading="Gang Muzik" headingHref="/" />}
          startContent={<span className="hidden items-center gap-1 sm:flex">{items}</span>}
          endContent={
            <HStack gap={1} vAlign="center">
              <Button
                href={STUDIO_URL}
                variant="ghost"
                size="sm"
                label="Đóng góp bài"
                tooltip="Đăng nhập bằng Google để gửi bài của bạn"
                icon={<Icon icon={PenLine} />}
              />
              <ThemeToggle />
            </HStack>
          }
        />
        <nav aria-label="Mục chính" className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:hidden">
          {items}
        </nav>
      </div>
    </header>
  );
}
