import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { DEFAULT_KEYMAP, keyLabel, type KeyMap, type PedalAction } from "@/hooks/usePedalKeys";
import { cn } from "@/lib/utils";

const LABELS: Record<PedalAction, { title: string; hint: string }> = {
  next: { title: "Tiến / Chạy", hint: "Chế độ trang: lật tới · Chế độ cuộn: chạy / dừng" },
  prev: { title: "Lùi", hint: "Chế độ trang: lật lùi · Chế độ cuộn: tua lại một đoạn" },
  toggle: { title: "Chạy / Dừng", hint: "Bật / tắt tự cuộn hoặc tự lật" },
};

export function KeyMapDialog({
  open,
  onOpenChange,
  keymap,
  onChange,
  countdown,
  onCountdown,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  keymap: KeyMap;
  onChange: (m: KeyMap) => void;
  countdown: number;
  onCountdown: (n: number) => void;
}) {
  const [listening, setListening] = useState<PedalAction | null>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") return setListening(null);
      const next = { ...keymap } as KeyMap;
      (Object.keys(next) as PedalAction[]).forEach((a) => {
        next[a] = next[a].filter((k) => k !== e.key);
      });
      next[listening] = [e.key, ...next[listening]].slice(0, 4);
      onChange(next);
      setListening(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [listening, keymap, onChange]);

  const close = (o: boolean) => {
    setListening(null);
    onOpenChange(o);
  };

  return (
    <Dialog isOpen={open} onOpenChange={close} width={520} maxHeight="90dvh">
      <Layout
        height="auto"
        header={
          <DialogHeader
            title="Pedal & phím tắt"
            subtitle="Pedal lật trang Bluetooth hoạt động như bàn phím. Bấm “Gán” rồi đạp pedal để gán phím."
            onOpenChange={close}
          />
        }
        content={
          <LayoutContent>
        <div className="space-y-3">
          {(Object.keys(LABELS) as PedalAction[]).map((a) => (
            <div key={a} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{LABELS[a].title}</div>
                <div className="text-xs text-muted-foreground">{LABELS[a].hint}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {keymap[a].map((k) => (
                    <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {keyLabel(k)}
                    </kbd>
                  ))}
                </div>
              </div>
              <Button
                variant={listening === a ? "primary" : "secondary"}
                size="sm"
                label={listening === a ? "Đạp pedal…" : "Gán"}
                className={cn(listening === a && "animate-pulse")}
                onClick={() => setListening(listening === a ? null : a)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <div className="font-semibold">Đếm ngược trước khi chạy</div>
              <div className="text-xs text-muted-foreground">Kịp cầm nhạc cụ vào tư thế</div>
            </div>
            <SegmentedControl label="Đếm ngược" size="sm" value={String(countdown)} onChange={(v) => onCountdown(Number(v))}>
              {[0, 3, 5].map((n) => (
                <SegmentedControlItem key={n} value={String(n)} label={n === 0 ? "Tắt" : `${n}s`} />
              ))}
            </SegmentedControl>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Phím <kbd className="rounded border border-border bg-muted px-1 font-mono">S</kbd>: mở / đóng bảng Cài đặt (trừ khi bạn gán S cho pedal).
          </p>
          <Button variant="ghost" size="sm" label="Khôi phục mặc định" onClick={() => onChange(DEFAULT_KEYMAP)} />
        </div>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
