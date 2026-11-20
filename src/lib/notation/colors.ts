import type { NoteName } from "./parse";

/** cảm âm colour per note name (CSS vars --note-*), shared by TextNotation and the practice page */
export const NOTE_CLASS: Record<NoteName, string> = {
  Do: "text-note-do",
  Re: "text-note-re",
  Mi: "text-note-mi",
  Fa: "text-note-fa",
  Sol: "text-note-sol",
  La: "text-note-la",
  Si: "text-note-si",
};

