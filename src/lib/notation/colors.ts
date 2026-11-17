import type { NoteName } from "./parse";

/** màu cảm âm theo tên nốt (biến CSS --note-*) — dùng chung cho TextNotation và trang luyện tập */
export const NOTE_CLASS: Record<NoteName, string> = {
  Do: "text-note-do",
  Re: "text-note-re",
  Mi: "text-note-mi",
  Fa: "text-note-fa",
  Sol: "text-note-sol",
  La: "text-note-la",
  Si: "text-note-si",
};

