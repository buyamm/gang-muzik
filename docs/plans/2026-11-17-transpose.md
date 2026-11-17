# Dịch giọng Eb/Bb (transpose cho kèn)

## Mục tiêu
Người chơi saxophone / kèn dịch giọng (Bb, Eb) xem được cảm âm và hợp âm đã dịch sẵn sang giọng của nhạc cụ, không phải tự tính.

## Thiết kế
- **Parser** (`src/lib/notation/parse.ts`): nốt có dấu hoá `#` / `b` ngay sau tên nốt (`Do#`, `Reb`, `Fa#2`, `Sib'`). Token nốt thêm `accidental?: "#" | "b"`. `B` hoa không được coi là dấu giáng.
- **Logic thuần** (`src/lib/notation/transpose.ts`):
  - `noteToSemitone` / `semitoneToNote` (có quãng tám, Do1 = 0).
  - `transposeNote(token, n, spelling, octaveShift)` → `{ note, accidental, octave }`.
  - `transposeChord("F#m7/C#", n, spelling)`: dịch gốc và bass sau `/`, giữ nguyên phần tính chất (m7, sus4, b5...).
  - `transposeChordLine(line, n, spelling)`: giữ cột — mỗi hợp âm bắt đầu đúng cột cũ; hợp âm dài ra thì lấn vào khoảng trắng phía sau, ngắn lại thì bù khoảng trắng (luôn chừa ≥ 1 khoảng trắng giữa hai hợp âm).
  - Cách viết dấu: `"sharp" | "flat" | "auto"`. Auto: giọng đích (giọng gốc + n) là giọng giáng (F, Bb, Eb, Ab, Db) → dùng b, còn lại dùng #. Giọng gốc lấy từ hợp âm đầu tiên của bài (thứ → giọng trưởng song song), không có thì coi là C.
  - Preset: Concert (C) = 0, Sib (Bb) = +2, Mib (Eb) = +9; tuỳ chỉnh −11..+11; dịch quãng tám −1/0/+1 cho cảm âm.
- **Hiển thị** (`TextNotation.tsx`): khi có dịch giọng, nhãn nốt dựng từ note + dấu (♯/♭) + quãng tám, giữ màu `NOTE_CLASS`; dịch dòng hợp âm và hợp âm chèn `[C]`. Không dịch → đầu ra y như cũ.
- **Stage**: nút "Giọng kèn" (popover) trong thanh công cụ, chỉ hiện khi bài có nhạc dạng chữ; lưu theo bài trong `ViewPrefs.transpose`, lựa chọn gần nhất lưu `gm:transpose` làm mặc định cho bài mới. Badge nhỏ trên nút (vd "Eb"). Truyền xuống `StageContent` và `BookView` (cả div đo).

## File
- `src/lib/notation/parse.ts`, `parse.test.ts`
- `src/lib/notation/transpose.ts`, `transpose.test.ts` (mới)
- `src/components/stage/TextNotation.tsx`, `StageContent.tsx`, `BookView.tsx`, `Stage.tsx`
- `src/components/stage/TransposeSettings.tsx` (mới)

## Kiểm tra
- `npm test`, `npm run typecheck`, `npm run build`.
- Trình duyệt: bài cảm âm + hợp âm, chọn Eb/Bb, đổi quãng tám, #/b; chế độ Cuộn & Sách; chọn C → giống hệt ban đầu.
