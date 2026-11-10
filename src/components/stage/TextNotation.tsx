import { memo, useMemo } from "react";
import { parseNotation, splitInlineChords, type NoteName, type Row, type Token } from "@/lib/notation/parse";
import { cn } from "@/lib/utils";

const NOTE_CLASS: Record<NoteName, string> = {
  Do: "text-note-do",
  Re: "text-note-re",
  Mi: "text-note-mi",
  Fa: "text-note-fa",
  Sol: "text-note-sol",
  La: "text-note-la",
  Si: "text-note-si",
};

function NoteToken({ t, colored }: { t: Token; colored: boolean }) {
  if (t.type === "sep") {
    if (t.text === " ") return <span className="inline-block w-[0.42em]" />;
    return <span className="mx-[0.06em] text-stage-lyric/70">{t.text}</span>;
  }
  if (t.type === "text") return <span className="text-stage-fg/80">{t.text}</span>;
  const base = t.text.replace(/\d+$|['’]+$/, "");
  return (
    <span className={cn("whitespace-nowrap", colored && NOTE_CLASS[t.note])}>
      {base}
      {t.octave !== 1 && <sup className="ml-[0.04em] text-[0.55em] font-extrabold">{t.octave}</sup>}
    </span>
  );
}

function Lyric({ row }: { row: Row }) {
  const text = row.lyric ?? "";
  const inline = splitInlineChords(text);
  // cảm âm: lời là phụ (nhỏ, nhạt); hợp âm / lời thường: lời là chính
  const secondary = !!row.notes;
  const base = secondary
    ? "mb-[0.15em] text-[0.85em] leading-snug font-medium text-stage-lyric"
    : "text-[1em] leading-snug font-medium text-stage-fg";
  if (inline) {
    return (
      <p className={cn(base, "pt-[1.1em]")}>
        {inline.map((seg, i) => (
          <span key={i} className="relative whitespace-pre-wrap">
            {seg.chord && (
              <span className="absolute -top-[1.15em] left-0 text-[0.85em] font-bold whitespace-nowrap text-primary">
                {seg.chord}
              </span>
            )}
            {seg.text || "\u00a0\u00a0"}
          </span>
        ))}
      </p>
    );
  }
  // có dòng hợp âm phía trên: dùng font đơn cách để canh thẳng cột
  return <p className={cn(base, row.chords !== undefined && "font-mono whitespace-pre-wrap", !row.chords && "text-pretty")}>{text}</p>;
}

export const TextNotation = memo(function TextNotation({
  text,
  colored = true,
  compact = false,
}: {
  text: string;
  colored?: boolean;
  compact?: boolean;
}) {
  const sections = useMemo(() => parseNotation(text), [text]);
  if (!sections.length) return null;
  return (
    <div className={compact ? "px-1" : "mx-auto max-w-5xl px-5 sm:px-10"}>
      {sections.map((sec, i) => (
        <section key={i} data-break className="pb-[1.8em]">
          {sec.rows.map((row, j) => (
            <div key={j} data-break className="pb-[1em]">
              {row.chords !== undefined && (
                <p className="font-mono text-[0.95em] leading-tight font-bold whitespace-pre-wrap text-primary">{row.chords}</p>
              )}
              {row.lyric !== undefined && <Lyric row={row} />}
              {row.tab && (
                <pre className="overflow-x-auto font-mono text-[0.8em] leading-snug text-stage-fg">{row.tab.join("\n")}</pre>
              )}
              {row.notes && (
                <p className="text-[1.55em] leading-[1.25] font-bold tracking-tight text-stage-fg">
                  {row.notes.map((t, k) => (
                    <NoteToken key={k} t={t} colored={colored} />
                  ))}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
});
