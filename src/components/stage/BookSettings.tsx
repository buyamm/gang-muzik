import { BookOpen, LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ColumnsPref, TurnBy } from "./BookView";

const COLUMN_OPTIONS: ColumnsPref[] = ["auto", 1, 2, 3, 4, "all"];

export function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export interface BookLayoutPanelProps {
  columns: ColumnsPref;
  autoCols: number;
  turnBy: TurnBy;
  onColumns: (c: ColumnsPref) => void;
  onTurnBy: (t: TurnBy) => void;
  className?: string;
}

/** book layout controls (pages per screen + turn step) without a trigger */
export function BookLayoutPanel({ columns, autoCols, turnBy, onColumns, onTurnBy, className }: BookLayoutPanelProps) {
  const fitAll = columns === "all";
  const shown = columns === "auto" || fitAll ? autoCols : columns;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div>
          <div className="text-sm font-semibold">Số trang trên màn hình</div>
          <div className="text-xs text-muted-foreground">
            Bao nhiêu trang giấy đặt cạnh nhau. Tự động: điện thoại 1, tablet 2, màn hình rộng 3.
          </div>
        </div>
        <div className="flex gap-1">
          {COLUMN_OPTIONS.filter((c) => c !== "all").map((c) => (
            <Choice key={c} active={columns === c} onClick={() => onColumns(c)}>
              {c === "auto" ? `Tự động (${fitAll ? "" : autoCols})`.replace(" ()", "") : c}
            </Choice>
          ))}
        </div>
        <Choice active={fitAll} onClick={() => onColumns(fitAll ? "auto" : "all")}>
          <span className="flex items-center justify-center gap-1.5">
            <LayoutGrid className="size-4" /> Tất cả trên 1 màn hình
          </span>
        </Choice>
        {fitAll && (
          <p className="text-xs text-muted-foreground">
            Thu nhỏ để thấy cả bài cùng lúc, không cần lật. Bài dài thì chữ sẽ nhỏ — tăng “Cỡ chữ” trong Cài đặt nếu cần, hoặc
            chọn lại số trang ở trên để quay về kiểu lật sách.
          </p>
        )}
      </div>
      <div className={cn("space-y-2", fitAll && "pointer-events-none opacity-40")} aria-disabled={fitAll}>
        <div>
          <div className="text-sm font-semibold">Mỗi lần lật (pedal, lăn chuột, vuốt)</div>
        </div>
        <div className="flex gap-1">
          <Choice active={turnBy === "spread"} onClick={() => onTurnBy("spread")}>
            Cả {shown} trang
          </Choice>
          <Choice active={turnBy === "page"} onClick={() => onTurnBy("page")}>
            Từng trang một
          </Choice>
        </div>
        <p className="text-xs text-muted-foreground">
          {turnBy === "spread"
            ? `Như lật sách: cả ${shown} trang đổi sang ${shown} trang tiếp theo trong một lần.`
            : "Mỗi lần chỉ bỏ đi trang đầu và thêm 1 trang mới ở cuối — trang bạn đang đọc vẫn nằm trên màn hình, không bị mất dấu."}
        </p>
      </div>
    </div>
  );
}

/** book layout settings: pages per screen + how a turn moves (popover trigger) */
export function BookSettings({
  onOpenChange,
  ...panel
}: Omit<BookLayoutPanelProps, "className"> & {
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-md bg-stage-fg/10 px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-stage-fg/20"
        >
          <BookOpen className="size-3.5" />
          Kiểu sách
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80" onClick={(e) => e.stopPropagation()}>
        <BookLayoutPanel {...panel} />
      </PopoverContent>
    </Popover>
  );
}
