import { memo, useMemo } from "react";
import { isChordToken, parseNotation, splitInlineChords, type NoteName, type Row, type Token } from "@/lib/notation/parse";
import {
  detectKeyPc,
  isIdentity,
  resolveSpelling,
  transposeChord,
  transposeChordLine,
  transposeNote,
  type NoteValue,
  type Spelling,
  type TransposeSetting,
} from "@/lib/notation/transpose";
import { cn } from "@/lib/utils";

/** dịch giọng đã tính sẵn cho cả bài (null = hiển thị nguyên bản) */
interface Shift {
  semitones: number;
  octave: number;
  spelling: Spelling;
}

const ACCIDENTAL_GLYPH = { "#": "♯", b: "♭" } as const;

const NOTE_CLASS: Record<NoteName, string> = {
  Do: "text-note-do",
  Re: "text-note-re",
  Mi: "text-note-mi",
  Fa: "text-note-fa",
  Sol: "text-note-sol",
  La: "text-note-la",
  Si: "text-note-si",
};

function NoteToken({ t, colored, shift }: { t: Token; colored: boolean; shift: Shift | null }) {
  if (t.type === "sep") {
    if (t.text === " ") return <span className="inline-block w-[0.42em]" />;
    return <span className="mx-[0.06em] text-stage-lyric/70">{t.text}</span>;
  }
  if (t.type === "text") return <span className="text-stage-fg/80">{t.text}</span>;
  if (shift) {
    const v = transposeNote(t, shift.semitones, shift.spelling, shift.octave);
    return (
      <span className={cn("whitespace-nowrap", colored && NOTE_CLASS[v.note])}>
        {v.note}
        {v.accidental && <span className="ml-[0.02em] text-[0.8em]">{ACCIDENTAL_GLYPH[v.accidental]}</span>}
        {v.octave !== 1 && <sup className="ml-[0.04em] text-[0.55em] font-extrabold">{v.octave}</sup>}
      </span>
    );
  }
  const base = t.text.replace(/\d+$|['’]+$/, "");
  return (
    <span className={cn("whitespace-nowrap", colored && NOTE_CLASS[t.note])}>
      {base}
      {t.octave !== 1 && <sup className="ml-[0.04em] text-[0.55em] font-extrabold">{t.octave}</sup>}
    </span>
  );
}

/** tap a note to look it up (e.g. its saxophone fingering): written = displayed note, concert = original token */
export type NoteClickHandler = (written: NoteValue, concert: NoteValue, el: HTMLElement) => void;

const toValue = (n: NoteValue): NoteValue =>
  n.accidental ? { note: n.note, octave: n.octave, accidental: n.accidental } : { note: n.note, octave: n.octave };

/** wraps a rendered note in a button; stops propagation so the stage tap (play / turn page) does not fire */
function NoteButton({
  t,
  shift,
  onNoteClick,
  children,
}: {
  t: NoteValue;
  shift: Shift | null;
  onNoteClick: NoteClickHandler;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const concert = toValue(t);
        const written = shift ? transposeNote(concert, shift.semitones, shift.spelling, shift.octave) : concert;
        onNoteClick(written, concert, e.currentTarget);
      }}
      className="cursor-pointer rounded-[0.15em] underline decoration-current/35 decoration-dotted decoration-[0.07em] underline-offset-[0.2em] hover:decoration-current/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

function Lyric({ row, shift }: { row: Row; shift: Shift | null }) {
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
                {shift?.semitones && isChordToken(seg.chord)
                  ? transposeChord(seg.chord, shift.semitones, shift.spelling)
                  : seg.chord}
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
  transpose,
  onNoteClick,
}: {
  text: string;
  colored?: boolean;
  compact?: boolean;
  /** dịch giọng cho nhạc cụ (Bb, Eb...); bỏ trống / 0 = nguyên bản */
  transpose?: TransposeSetting;
  /** when set, notes become buttons (fingering lookup) */
  onNoteClick?: NoteClickHandler;
}) {
  const sections = useMemo(() => parseNotation(text), [text]);
  const semitones = transpose?.semitones ?? 0;
  const octave = transpose?.octave ?? 0;
  const spellingPref = transpose?.spelling ?? "auto";
  const shift = useMemo<Shift | null>(() => {
    if (isIdentity({ semitones, octave, spelling: spellingPref })) return null;
    return { semitones, octave, spelling: resolveSpelling(spellingPref, semitones, detectKeyPc(sections)) };
  }, [sections, semitones, octave, spellingPref]);
  if (!sections.length) return null;
  return (
    <div className={compact ? "px-1" : "mx-auto max-w-5xl px-5 sm:px-10"}>
      {sections.map((sec, i) => (
        <section key={i} data-break className="pb-[1.8em]">
          {sec.rows.map((row, j) => (
            <div key={j} data-break className="pb-[1em]">
              {row.chords !== undefined && (
                <p className="font-mono text-[0.95em] leading-tight font-bold whitespace-pre-wrap text-primary">
                  {shift?.semitones ? transposeChordLine(row.chords, shift.semitones, shift.spelling) : row.chords}
                </p>
              )}
              {row.lyric !== undefined && <Lyric row={row} shift={shift} />}
              {row.tab && (
                <pre className="overflow-x-auto font-mono text-[0.8em] leading-snug text-stage-fg">{row.tab.join("\n")}</pre>
              )}
              {row.notes && (
                <p className="text-[1.55em] leading-[1.25] font-bold tracking-tight text-stage-fg">
                  {row.notes.map((t, k) =>
                    onNoteClick && t.type === "note" ? (
                      <NoteButton key={k} t={t} shift={shift} onNoteClick={onNoteClick}>
                        <NoteToken t={t} colored={colored} shift={shift} />
                      </NoteButton>
                    ) : (
                      <NoteToken key={k} t={t} colored={colored} shift={shift} />
                    ),
                  )}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
});
