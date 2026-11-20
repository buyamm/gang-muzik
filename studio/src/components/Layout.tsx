import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ExternalLink, Inbox, LibraryBig, LogOut, Menu, Music2, Users as UsersIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompactFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/brand/Staff";
import { PUBLIC_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Music2;
  end?: boolean;
  badge?: number;
}

export function Layout() {
  const { isAdmin } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const pending = useQuery({
    queryKey: ["songs", "all", "pending"],
    queryFn: () => api.listSongs({ scope: "all", status: "pending" }),
    enabled: isAdmin,
  });

  const nav: NavItem[] = [
    { to: "/", label: "Bài của tôi", icon: Music2, end: true },
    ...(isAdmin
      ? [
          { to: "/review", label: "Chờ duyệt", icon: Inbox, badge: pending.data?.length },
          { to: "/all", label: "Tất cả bài", icon: LibraryBig },
          { to: "/users", label: "Người dùng", icon: UsersIcon },
        ]
      : []),
  ];

  return (
    <div className="min-h-full lg:pl-60">
      {/* desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r bg-card lg:flex">
        <SidebarContent nav={nav} />
      </aside>

      {/* mobile: top bar + slide-in menu */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur-sm lg:hidden">
          <DialogPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mở menu">
              <Menu />
            </Button>
          </DialogPrimitive.Trigger>
          <NavLink to="/" className="flex items-center gap-2 font-display text-base font-bold">
            <LogoMark className="size-7" />
            Gang Muzik Studio
          </NavLink>
          {!!pending.data?.length && (
            <NavLink to="/review" className="ml-auto rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground" aria-label={`${pending.data.length} bài chờ duyệt`}>
              {pending.data.length} chờ duyệt
            </NavLink>
          )}
        </header>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] border-r bg-card shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Menu Studio</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Chuyển giữa các trang của Studio</DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="absolute top-3 right-2" aria-label="Đóng menu">
                <X />
              </Button>
            </DialogPrimitive.Close>
            <SidebarContent nav={nav} onNavigate={() => setMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-h-[calc(100vh-3.25rem)] flex-col lg:min-h-screen">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <footer className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <CompactFooter />
          </div>
        </footer>
      </div>
    </div>
  );
}

function SidebarContent({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const { user, isAdmin } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const logout = async () => {
    onNavigate?.();
    await api.logout().catch(() => {});
    qc.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-0 w-full flex-col">
      <NavLink to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-6 font-display text-lg font-bold">
        <LogoMark className="size-8" />
        Gang Muzik Studio
      </NavLink>

      <nav aria-label="Studio" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )
                }
              >
                <n.icon className="size-4 shrink-0" />
                <span className="flex-1">{n.label}</span>
                {!!n.badge && (
                  <span className="rounded-md bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">{n.badge}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t px-3 py-3">
        <div className="flex items-center gap-1">
          <a
            href={PUBLIC_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ExternalLink className="size-4" /> Mở thư viện
          </a>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2.5 px-3 pt-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-8 shrink-0 rounded-full" />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold">
              {(user?.name || user?.email || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user?.name || user?.email}</div>
            <div className="text-[11px] whitespace-nowrap text-muted-foreground">{isAdmin ? "Quản trị viên" : "Người đóng góp"}</div>
          </div>
          <Button variant="ghost" size="icon" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}>
            <LogOut />
          </Button>
        </div>
      </div>
    </div>
  );
}
