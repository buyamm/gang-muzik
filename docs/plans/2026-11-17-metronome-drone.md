# Metronome + drone (feature B)

## Mục tiêu
Trong Stage, người chơi bật được máy đếm nhịp (metronome) và nốt nền (drone) để tập theo bài — không thêm thư viện, chỉ dùng Web Audio API.

## Thiết kế
- `src/lib/audio/engine.ts`: một AudioContext dùng chung, tạo lười, `resume()` khi có thao tác người dùng (hỗ trợ `webkitAudioContext` của Safari).
  - Metronome: lập lịch kiểu lookahead (setInterval ~25ms, lên lịch trước ~100ms theo `ctx.currentTime`), phách mạnh đầu ô nhịp, số phách/ô nhịp, chia nhỏ (subdivision), callback `onBeat(beatIndex, time)` để đồng bộ hình.
  - Drone: oscillator sine + chút triangle qua low-pass, fade gain vào/ra để không bị "click", chỉnh âm lượng, đổi nốt mượt.
  - `playTone(freq, durationSec)` cho nốt tham chiếu ngắn (trang luyện âm giai sau này dùng lại).
  - Hàm thuần tách riêng (`src/lib/audio/math.ts`) để test: `noteToFrequency`, `bpmToInterval`, toán lập lịch phách, `tapTempo`.
- Hooks `useMetronome`, `useDrone`: bọc engine, dọn dẹp khi unmount, trả về trạng thái (đang chạy, phách hiện tại). Dừng khi tab bị ẩn.
- UI `src/components/stage/MetronomePanel.tsx`: popover "Nhịp & drone" mở từ IconBtn trong `tools`; BPM (số, −/+, gõ nhịp), số phách 2/3/4/6, âm lượng, bật/tắt, chấm nhấp nháy theo phách; drone chọn nốt (Đô, Đô#, Rê… Si + tên chữ), quãng tám, âm lượng, bật/tắt. Chấm báo đang chạy trên nút. Đếm vào bằng tiếng click trong lúc đếm ngược nếu metronome đang bật.
- Lưu: BPM/phách theo bài trong `ViewPrefs` (mặc định `song.settings.bpm` hoặc 80); âm lượng + nốt drone toàn cục ở key `gm:audio`. `saveDefaults` lưu cả `bpm`. Studio `SongEditor` có ô BPM.

## Tệp
- mới: `src/lib/audio/engine.ts`, `src/lib/audio/math.ts`, `src/lib/audio/math.test.ts`, `src/hooks/useMetronome.ts`, `src/hooks/useDrone.ts`, `src/components/stage/MetronomePanel.tsx`
- sửa: `src/components/stage/Stage.tsx` (chèn nhỏ), `studio/src/routes/SongEditor.tsx`

## Kiểm tra
- `npm test`, `npm run typecheck`, `npm run build`
- Trên trình duyệt: mở bài → "Nhịp & drone" → bật metronome (nghe click, chấm nhấp nháy), gõ nhịp, đổi phách; bật drone, đổi nốt; rời Stage / ẩn tab → tắt tiếng; admin "Lưu" → `settings_json.bpm`.
