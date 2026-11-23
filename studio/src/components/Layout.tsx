import { Outlet, useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Inbox, LibraryBig, LogOut, Music2, Users as UsersIcon, type LucideIcon } from "lucide-react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Text } from "@astryxdesign/core/Text";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/Staff";
import { PUBLIC_URL } from "@/lib/links";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  /** match the path exactly (needed for "/") */
  end?: boolean;
  badge?: number;
}

const isActive = (pathname: string, { to, end }: NavEntry) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

/**
 * Studio frame (Astryx template "AppShell - Side Nav Only"): side nav with the pages,
 * the signed-in user in its footer and global actions in the footer icons.
 * Pages own their padding (Astryx page templates); below the breakpoint the nav moves into the drawer.
 */
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

  const mine: NavEntry[] = [{ to: "/", label: "Bài của tôi", icon: Music2, end: true }];
  const admin: NavEntry[] = [
    {
      to: "/review",
      label: "Chờ duyệt",
      icon: Inbox,
      badge: pending.data?.length,
    },
    { to: "/all", label: "Tất cả bài", icon: LibraryBig },
    { to: "/users", label: "Người dùng", icon: UsersIcon },
  ];

  const logout = async () => {
    await api.logout().catch(() => {});
    qc.clear();
    navigate("/login", { replace: true });
  };

  const item = (n: NavEntry) => (
    <SideNavItem
      key={n.to}
      href={n.to}
      label={n.label}
      icon={n.icon}
      isSelected={isActive(pathname, n)}
      endContent={n.badge ? <Badge variant="warning" label={n.badge} /> : undefined}
    />
  );
  const displayName = user?.name || user?.email || "";

  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          header={<SideNavHeading icon={<LogoMark className="size-7" />} heading="Gang Muzik Studio" headingHref="/" />}
          footer={
            <HStack gap={2} vAlign="center" paddingInline={2} paddingBlock={2}>
              <Avatar src={user?.avatarUrl || undefined} name={displayName || "?"} size="sm" tooltip={false} />
              <StackItem size="fill">
                <VStack gap={0}>
                  <Text weight="medium" maxLines={1}>
                    {displayName}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {isAdmin ? "Quản trị viên" : "Người đóng góp"}
                  </Text>
                </VStack>
              </StackItem>
              <IconButton variant="ghost" size="sm" label="Đăng xuất" tooltip="Đăng xuất" icon={<Icon icon={LogOut} />} onClick={logout} />
            </HStack>
          }
          footerIcons={
            <>
              <IconButton
                href={PUBLIC_URL}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                label="Mở thư viện"
                tooltip="Mở thư viện"
                icon={<Icon icon={ExternalLink} />}
              />
              <ThemeToggle />
            </>
          }
        >
          <SideNavSection title="Đóng góp" isHeaderHidden={!isAdmin}>
            {mine.map(item)}
          </SideNavSection>
          {isAdmin && <SideNavSection title="Quản trị">{admin.map(item)}</SideNavSection>}
        </SideNav>
      }
    >
      <Outlet />
    </AppShell>
  );
}
