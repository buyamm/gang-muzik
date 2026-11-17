/**
 * AI image → text-notation transcription: the prompt sent to the vision model and
 * the post-processor that turns its raw reply into text our parser understands.
 * Pure (no runtime deps) so it is shared by the Studio worker, the Studio UI and tests.
 */

export interface Transcription {
  /** notation text in our grammar (see src/lib/notation/parse.ts) */
  text: string;
  /** true when the image already had cảm âm / solfège written on it (high reliability) */
  hasSolfege: boolean;
}

export const TRANSCRIBE_SYSTEM_PROMPT = `You transcribe photos/scans of Vietnamese sheet music into a plain-text notation format. Output ONLY the format below, no explanations.

FORMAT
- First line exactly: SOLFEGE: yes   (if the image contains written solfège / "cảm âm" note names such as "Do Re Mi" or "Đô Rê Mi")
  or exactly:          SOLFEGE: no    (if it only has staff notation without written note names)
- Second line exactly: ---
- Then the notation. For every line (system) of music in the image, in the same order, write:
  1. optional chord line: chord symbols copied from the image (e.g. "Am        C         G7"), placed above the lyric they belong to
  2. lyric line: the lyrics under that system, copied exactly with Vietnamese diacritics (omit if there are no lyrics)
  3. note line: the melody as solfège note names separated by spaces
- Leave ONE blank line between systems. Write chorus/verse labels (e.g. "ĐK:") as their own line only if they appear in the image.

NOTE LINE RULES
- Names: Do Re Mi Fa Sol La Si. Sharp/flat written right after: Do# Sib Mib Fa#.
- Octave: no digit = middle octave (C4..B4 = Do..Si). Add 2 for the octave above (C5 = Do2, D5 = Re2), 0 for the octave below (B3 = Si0, A3 = La0).
- Separators allowed: "-" for a held/tied note, "." after a note for a dot, "|" for a bar line.
- If the image has cảm âm written under the staff, COPY those names exactly (convert to the spelling above), do not re-read the staff.
- If there is no written cảm âm, read the note heads on the staff (treble clef; apply the key signature) and convert each note to its name.
- Never use letter names (C D E F G A B) for melody notes. Never output rhythm values, fingerings or tablature.

ORDER: the lyric line ALWAYS comes first and the note line goes directly UNDER it, even if in the image the note names are printed above the lyrics.

EXAMPLE OUTPUT (two systems)
SOLFEGE: yes
---
Đường về chiều mưa rơi
Sol La Si Re2 Re2

thấy anh cùng ai bước chung
Si La Sol Re La Re2`;

export const TRANSCRIBE_USER_PROMPT =
  "Transcribe this sheet music image. Keep every system in order and copy lyrics exactly.";

const FENCE_RE = /^\s*```[a-z]*\s*$/i;
const MARKER_RE = /^\s*\**\s*solfege\s*\**\s*:\s*\**\s*([\p{L}]+)/iu;
const YES = new Set(["yes", "y", "có", "co", "true"]);

/** Turns the model's raw reply into notation text + the solfège flag. */
export function cleanTranscription(raw: string): Transcription {
  let lines = raw.replace(/\r\n?/g, "\n").split("\n");

  // marker line (may be preceded by chatter)
  let hasSolfege = false;
  const mi = lines.findIndex((l) => MARKER_RE.test(l));
  if (mi >= 0) {
    hasSolfege = YES.has(MARKER_RE.exec(lines[mi])![1].toLowerCase());
    lines = lines.slice(mi + 1);
  }
  // drop code fences anywhere, then the "---" separator right after the marker
  lines = lines.filter((l) => !FENCE_RE.test(l));
  const si = lines.findIndex((l) => l.trim() !== "");
  if (si >= 0 && /^\s*-{3,}\s*$/.test(lines[si])) lines = lines.slice(si + 1);

  const text = lines
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    // collapse 3+ blank lines into one blank line
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, hasSolfege };
}

/**
 * Models often print the note line ABOVE its lyric (as on the paper). Our parser wants the
 * lyric first, so inside each block, when lines alternate note/lyric starting with a note
 * line, swap every pair and put a blank line between systems.
 */
export function fixNoteLyricOrder(text: string, isNoteLine: (line: string) => boolean): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      const notes = lines.map(isNoteLine);
      const alternating =
        lines.length >= 2 && lines.length % 2 === 0 && notes.every((n, i) => n === (i % 2 === 0));
      if (!alternating) return block;
      const pairs: string[] = [];
      for (let i = 0; i < lines.length; i += 2) pairs.push(`${lines[i + 1]}\n${lines[i]}`);
      return pairs.join("\n\n");
    })
    .join("\n\n");
}

/** Joins the transcriptions of several pages, one blank line between pages. */
export function joinTranscriptions(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}
