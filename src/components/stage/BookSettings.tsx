import { BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ColumnsPref, TurnBy } from "./BookView";

const COLUMN_OPTIONS: ColumnsPref[] = ["auto", 1, 2, 3, 4];

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** cài đặt kiểu hiển thị sách: số trang cùng lúc + cách lật */
export function BookSettings({
  columns,
  autoCols,
  turnBy,
  onColumns,
  onTurnBy,
  onOpenChange,
}: {
  columns: ColumnsPref;
  autoCols: number;
  turnBy: TurnBy;
  onColumns: (c: ColumnsPref) => void;
  onTurnBy: (t: TurnBy) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const shown = columns === "auto" ? autoCols : columns;
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
      <PopoverContent side="top" align="end" className="w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold">Số trang trên màn hình</div>
            <div className="text-xs text-muted-foreground">
              Bao nhiêu trang giấy đặt cạnh nhau. Tự động: điện thoại 1, tablet 2, màn hình rộng 3.
            </div>
          </div>
          <div className="flex gap-1">
            {COLUMN_OPTIONS.map((c) => (
              <Choice key={c} active={columns === c} onClick={() => onColumns(c)}>
                {c === "auto" ? `Tự động (${autoCols})` : c}
              </Choice>
            ))}
          </div>
        </div>
        <div className="space-y-2">
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
      </PopoverContent>
    </Popover>
  );
}
