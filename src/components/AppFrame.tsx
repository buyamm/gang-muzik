import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { AudioLines, Hand, LibraryBig, PenLine, type LucideIcon } from "lucide-react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompactFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/brand/Staff";
import { STUDIO_URL } from "@/lib/links";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  /** match the path exactly (needed for "/") */
  end?: boolean;
}

/** Main sections of the public site, in nav order */
export const SITE_NAV: NavEntry[] = [
  { to: "/", label: "Thư viện", icon: LibraryBig, end: true },
  { to: "/fingering", label: "Thế bấm", icon: Hand },
  { to: "/practice", label: "Luyện gam", icon: AudioLines },
];

const isActive = (pathname: string, { to, end }: NavEntry) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

/**
 * Public site frame (Astryx template "AppShell - Side Nav Only"): side nav with the sections,
 * contribute link and appearance picker; content with a one-line legal footer.
 * The mobile breakpoint moves the side nav into AppShell's drawer.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          header={<SideNavHeading icon={<LogoMark className="size-7" />} heading="Gang Muzik" headingHref="/" />}
          footerIcons={<ThemeToggle />}
        >
          <SideNavSection title="Học và chơi" isHeaderHidden>
            {SITE_NAV.map((n) => (
              <SideNavItem key={n.to} label={n.label} icon={n.icon} href={n.to} isSelected={isActive(pathname, n)} />
            ))}
          </SideNavSection>
          <SideNavSection title="Cộng đồng">
            <SideNavItem label="Đóng góp bài" icon={PenLine} href={STUDIO_URL} />
          </SideNavSection>
        </SideNav>
      }
    >
      {/* pages own their padding (Astryx page templates); the footer matches their padding 6 */}
      <div className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <CompactFooter base="" className="mx-6 mt-6 border-t border-border py-4" />
      </div>
    </AppShell>
  );
}
