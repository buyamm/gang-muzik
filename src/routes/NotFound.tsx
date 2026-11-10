import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFound({ message = "Không tìm thấy trang này." }: { message?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="staff-lines flex h-[calc(var(--staff-gap)*4+1px)] w-56 items-center justify-center font-display text-7xl font-extrabold text-primary [--staff-gap:16px]">404</p>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/">Về thư viện</Link>
      </Button>
    </div>
  );
}
