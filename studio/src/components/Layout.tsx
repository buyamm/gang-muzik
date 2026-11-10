import { NavLink, Outlet, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Inbox, LibraryBig, LogOut, Music2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/Staff";
import { cn } from "@/lib/utils";
import { api } from "@studio/lib/api";
import { useMe } from "@studio/hooks/useMe";

const PUBLIC_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? "http://localhost:5173"
  : "https://gang-muzik.lytruong.workers.dev";

export function Layout() {
  const { user, isAdmin } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pending = useQuery({
    queryKey: ["songs", "all", "pending"],
    queryFn: () => api.listSongs({ scope: "all", status: "pending" }),
    enabled: isAdmin,
  });

  const logout = async () => {
    await api.logout().catch(() => {});
    qc.clear();
    navigate("/login", { replace: true });
  };

  const nav = [
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
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold whitespace-nowrap">
            <LogoMark className="size-7" />
            <span className="hidden xl:inline">Gang Muzik Studio</span>
          </NavLink>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <n.icon className="size-4" />
                <span className="hidden md:inline">{n.label}</span>
                {!!("badge" in n && n.badge) && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <Button asChild variant="ghost" size="icon" title="Mở thư viện công khai">
            <a href={PUBLIC_URL} target="_blank" rel="noreferrer">
              <ExternalLink />
            </a>
          </Button>
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-2">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold">
                  {(user.name || user.email)[0]?.toUpperCase()}
                </div>
              )}
              <div className="hidden leading-tight lg:block">
                <div className="max-w-40 truncate text-sm font-medium">{user.name || user.email}</div>
                <div className="text-[11px] text-muted-foreground">{isAdmin ? "Quản trị viên" : "Người đóng góp"}</div>
              </div>
              <Button variant="ghost" size="icon" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}>
                <LogOut />
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
