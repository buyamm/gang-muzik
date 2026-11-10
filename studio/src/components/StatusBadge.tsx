import type { SongStatus } from "@shared/types";
import { STATUS_LABEL } from "@shared/permissions";
import { cn } from "@/lib/utils";

const STYLE: Record<SongStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status, className }: { status: SongStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", STYLE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
