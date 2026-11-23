import { Children, isValidElement, type ReactNode } from "react";
import { LayoutGrid } from "lucide-react";
import { Icon } from "@astryxdesign/core/Icon";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { cn } from "@/lib/utils";
import type { ColumnsPref, TurnBy } from "./BookView";

const COLUMN_OPTIONS: ColumnsPref[] = ["auto", 1, 2, 3, 4, "all"];

/** plain text of a node tree, for accessible labels */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return Children.toArray(node.props.children).map(textOf).join(" ");
  return "";
}

/** one option of a pressed-button group (Astryx ToggleButton) */
export function Choice({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <ToggleButton
      size="sm"
      label={label ?? textOf(children).replace(/\s+/g, " ").trim()}
      isPressed={active}
      onPressedChange={() => onClick()}
      className="w-full min-w-0 flex-1"
    >
      {children}
    </ToggleButton>
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
        <Choice active={columns === "auto"} onClick={() => onColumns("auto")}>
          {`Tự động${fitAll ? "" : ` (${autoCols} trang)`}`}
        </Choice>
        <div className="flex gap-1">
          {COLUMN_OPTIONS.filter((c) => c !== "all" && c !== "auto").map((c) => (
            <Choice key={c} active={columns === c} onClick={() => onColumns(c)} label={`${c} trang`}>
              {c}
            </Choice>
          ))}
        </div>
        <Choice active={fitAll} onClick={() => onColumns(fitAll ? "auto" : "all")}>
          <span className="flex items-center justify-center gap-1.5">
            <Icon icon={LayoutGrid} size="sm" /> Tất cả trên 1 màn hình
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
