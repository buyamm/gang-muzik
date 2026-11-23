import { useLocation } from "react-router";
import { useSeo } from "@/lib/seo";
import { notFoundSeo } from "@shared/seo";
import { Button } from "@astryxdesign/core/Button";

export function NotFound({ message = "Không tìm thấy trang này." }: { message?: string }) {
  useSeo(notFoundSeo(useLocation().pathname));
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="staff-lines flex h-[calc(var(--staff-gap)*4+1px)] w-56 items-center justify-center font-display text-7xl font-bold [--staff-gap:16px]">404</p>
      <p className="text-muted-foreground">{message}</p>
      <Button href="/" label="Về thư viện" />
    </div>
  );
}
