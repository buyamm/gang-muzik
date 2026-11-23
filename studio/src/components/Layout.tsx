import { Outlet, useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Inbox, LibraryBig, LogOut, Music2, Users as UsersIcon } from "lucide-react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { VStack } from "@astryxdesign/core/VStack";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompactFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/brand/Staff";
import { PUBLIC_URL } from "@/lib/links";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Music2;
  end?: boolean;
  badge?: number;
}

const isActive = (pathname: string, { to, end }: NavItem) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

/** Studio frame: Astryx AppShell with a top bar (identity, global actions) and a side nav (pages). */
export function Layout() {
  const { user, isAdmin } = useMe();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pending = useQuery({
    queryKey: ["songs", "all", "pending"],
    queryFn: () => api.listSongs({ scope: "all", status: "pending" }),
    enabled: isAdmin,
  });

  const mine: NavItem[] = [{ to: "/", label: "Bài của tôi", icon: Music2, end: true }];
  const admin: NavItem[] = isAdmin
    ? [
        { to: "/review", label: "Chờ duyệt", icon: Inbox, badge: pending.data?.length },
        { to: "/all", label: "Tất cả bài", icon: LibraryBig },
        { to: "/users", label: "Người dùng", icon: UsersIcon },
      ]
    : [];

  const logout = async () => {
    await api.logout().catch(() => {});
    qc.clear();
    navigate("/login", { replace: true });
  };

  const item = (n: NavItem) => (
    <SideNavItem
      key={n.to}
      href={n.to}
      label={n.label}
      icon={<Icon icon={n.icon} />}
      isSelected={isActive(pathname, n)}
      endContent={n.badge ? <Badge variant="warning" label={n.badge} /> : undefined}
    />
  );
  const displayName = user?.name || user?.email || "";

  return (
    <AppShell
      height="auto"
      variant="section"
      topNav={
        <TopNav
          label="Studio"
          heading={<TopNavHeading logo={<LogoMark className="size-7" />} heading="Gang Muzik Studio" headingHref="/" />}
          endContent={
            <HStack gap={1} vAlign="center">
              <Button
                href={PUBLIC_URL}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                size="sm"
                label="Mở thư viện"
                icon={<Icon icon={ExternalLink} />}
              />
              <ThemeToggle />
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav
          footer={
            <HStack gap={2} vAlign="center" paddingInline={2} paddingBlock={2}>
              <Avatar src={user?.avatarUrl ?? undefined} name={displayName || "?"} size="sm" />
              <VStack gap={0} className="min-w-0 flex-1">
                <Text weight="medium" maxLines={1}>
                  {displayName}
                </Text>
                <Text type="supporting" color="secondary">
                  {isAdmin ? "Quản trị viên" : "Người đóng góp"}
                </Text>
              </VStack>
              <IconButton variant="ghost" size="sm" label="Đăng xuất" tooltip="Đăng xuất" icon={<Icon icon={LogOut} />} onClick={logout} />
            </HStack>
          }
        >
          <SideNavSection title="Đóng góp" isHeaderHidden={!isAdmin}>
            {mine.map(item)}
          </SideNavSection>
          {isAdmin && <SideNavSection title="Quản trị">{admin.map(item)}</SideNavSection>}
        </SideNav>
      }
    >
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <CompactFooter />
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
