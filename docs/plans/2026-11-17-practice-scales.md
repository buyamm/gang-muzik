# Luyện tập cùng gam (`/practice`)

Trang luyện âm giai / nốt dài cho người chơi kèn (sax…), dùng lại module dịch giọng (PR #11) và âm thanh (PR #10).

## Lõi thuần — `src/lib/practice/scales.ts` (+ `scales.test.ts`)
- Loại gam: trưởng, thứ tự nhiên, thứ hoà âm, ngũ cung trưởng, ngũ cung thứ, blues, chromatic; bài tập phụ: hợp âm rải chủ âm (1-3-5-8).
- 12 chủ âm, 1 hoặc 2 quãng tám; kiểu chạy: đi lên, lên rồi xuống, quãng 3 (1-3, 2-4… lên rồi xuống).
- **Chủ âm chọn theo giọng viết** (nốt người chơi đọc trên nhạc cụ); hiện kèm tên concert.
  Concert = viết − bán cung dịch − 12 × quãng tám dịch (nghịch đảo `transposeNote`). Do1 concert = C4 (MIDI 60) → tần số qua `midiToFrequency`.
- Quãng tám bắt đầu (viết) tự chọn: chủ âm Sib/Si bắt đầu ở quãng 0 (vừa tầm sax Bb3…F6), còn lại quãng 1; người dùng dịch thêm −1/0/+1.
- **Cách viết dấu theo giọng (letter-based):** gam 7 nốt mỗi bậc một chữ nốt liên tiếp từ chữ của chủ âm (Fa trưởng → Sib, không La#);
  ngũ cung / blues lấy chữ của bậc tương ứng trong gam mẹ (blues: bậc 5 giáng → Solb trong Do blues). Tên chủ âm theo bảng giọng quen dùng
  (trưởng: Reb, Mib, Fa#, Lab, Sib…; thứ: Do#, Mib, Fa#, Sol#, Sib…) hoặc theo kiểu dấu ép buộc (♯/♭) của người dùng.
  Nốt cần dấu kép (vd Fa## trong Sol# thứ hoà âm) → viết lại theo kiểu dấu của giọng (Sol). Chromatic dùng kiểu dấu của giọng.
- `practiceStep(tick, …)`: tick → đếm vào / nốt đang chơi / nghỉ; vòng lặp được làm tròn lên đủ ô nhịp (nốt cuối ngân hết ô).
  Chế độ nốt dài: mỗi nốt giữ N phách + nghỉ M phách, trả về tiến độ.

## Âm thanh
- `useMetronome` thêm tuỳ chọn `onSchedule(beat, time, sub)` (gọi lúc lên lịch, mọi tiếng chia nhỏ) — tương thích ngược.
- `playTone` thêm tham số `when` (thời điểm phát theo audioNow) để nốt tham chiếu khớp đúng tiếng click.
- Drone chủ âm (concert) qua `useDrone`. Âm lượng dùng chung `gm:audio` (xuất `loadAudioPrefs`/`saveAudioPrefs` từ MetronomePanel).

## UI
- `src/routes/Practice.tsx`, `src/components/practice/*`: chọn giọng kèn (mặc định `gm:transpose`), chủ âm (tên viết + concert), loại gam,
  quãng tám, kiểu chạy, BPM (−/+, gõ nhịp), số nốt mỗi phách (1/2); chế độ Âm giai / Nốt dài.
- Nốt hiện thành chip cảm âm lớn, màu `NOTE_CLASS` (dùng chung với `TextNotation`); nốt đang chơi được tô sáng theo `onBeat`.
- Bắt đầu: đếm vào 1 ô nhịp (tuỳ chọn), lặp lại, bật/tắt nốt tham chiếu, drone chủ âm. Nốt dài: N = 2/4/8 phách, nghỉ M = 0/1/2/4, vòng tiến độ, chữ lớn.
- Lưu cài đặt vào `gm:practice` qua `prefs.ts`. Tắt âm khi rời trang / ẩn tab (hook sẵn có). Giữ màn hình sáng khi chạy.
- Phím: Space bắt đầu/dừng; dùng luôn sơ đồ pedal (`loadKeyMap`): "toggle" = bắt đầu/dừng.

## SEO
- `PRACTICE_SEO` trong `shared/seo.ts`, route trong `worker/seo.ts`, sitemap, `run_worker_first` thêm `/practice`, `useSeo` phía client.
- ~~Link "Luyện tập" trên header thư viện~~ — bỏ (2026-11-20): nav chung `SiteHeader` (nhánh `feat/sax-sao-focus`) sẽ link `/practice`.

## Cập nhật 2026-11-20 (đồng bộ `main`, xem `2026-11-20-sax-sao-learning.md` mục 4)
- Chọn giọng kèn theo `HORN_PRESETS` (Concert, Alto, Tenor, Soprano, Baritone + Tuỳ chỉnh nếu đang dùng), lưu chung pref `gm:transpose`
  (`TransposeSetting` có `preset`) — thay cho `TRANSPOSE_PRESETS` C/Bb/Eb (đã @deprecated).
- `src/lib/practice/instrument.ts`:
  - `practiceRange(preset)` — chỗ DUY NHẤT tra tầm âm: sax → `SAX_WRITTEN_RANGE` (`range.ts`), concert/tuỳ chỉnh → null.
    Khi có `rangeFor(preset)` (sáo trúc 0..24) chỉ cần đổi thân hàm thành `return rangeFor(preset)`.
  - `practiceTranspose(t)` — preset sax phát đúng cao độ thật của kèn (tenor/baritone thấp thêm 1 quãng tám), không dùng quãng tám lưu cho Stage;
    concert/tuỳ chỉnh giữ nguyên bán cung + quãng tám.
  - `selectPreset(t, id)` — ghi đúng dạng mà Stage ghi (`preset`, `semitones`, `autoOctave`).
- Quãng tám bắt đầu = quãng thấp nhất mà chủ âm còn nằm trong tầm (sax: Sib/Si quãng 0, còn lại quãng 1); nốt ngoài tầm hiện ô viền đứt + dòng cảnh báo.
- Ô "Quãng tám của kèn" chỉ hiện với concert/tuỳ chỉnh.

## Kiểm tra
- `npm test`, `npm run typecheck`, `npm run build`.
- Trình duyệt (coordinator): chọn Mib/Sib, Fa trưởng hiện Sib; chạy 1 & 2 nốt/phách; nốt dài; drone; Space/pedal; 375px sáng/tối.
