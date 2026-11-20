# Bộ công cụ sax đợt 2: loại kèn + tầm âm, tone gốc, thế bấm, dấu lấy hơi

> Khi duyệt: lưu thành `docs/plans/2026-11-20-sax-toolkit.md` và commit trên **cả 4 nhánh**, nội dung giống hệt nhau.

## Context
Bạn hỏi: research lại xem site còn thiếu gì cho người chơi saxophone. Đợt 1 (17/11, `docs/plans/2026-11-17-sax-research.md`) đã ship **dịch giọng Eb/Bb** (PR #11) và **metronome + drone** (PR #10). PR #12 (`/practice` luyện gam) và PR #14 (AI đọc ảnh → chữ) vẫn đang mở, **không** nằm trong đợt này.

Khảo sát code + web (chart transposition, app sax như TonalEnergy/Tomplay/Flat, sách hướng dẫn) cho thấy các lỗ hổng sau, bạn đã chọn 4 mục để làm:

1. **Loại kèn + tầm âm.** Preset chỉ có C/Bb/Eb, quãng tám để người chơi tự xoay. Thực tế tenor = +14, bari = +21. Không có kiểm tra tầm kèn: nốt viết Bb3–F#6 = cảm âm **Sib0–Fa#3** (Do1 = C4, giống quy ước PR #12). Drone hiện tên nốt concert, trong khi người chơi đang đọc nốt viết cho kèn (`MetronomePanel.tsx:67`).
2. **Không có tone gốc.** Giọng gốc được đoán từ hợp âm đầu (`transpose.ts:159`). Bài chỉ có cảm âm bị coi là C, nên chọn ♯/♭ sai. Bài dạng ảnh thì người chơi sax không biết phải thổi ở tone nào.
3. **Không có thế bấm** ở đâu cả.
4. **Không có dấu lấy hơi.** Dấu `,` đang là dấu tách câu trong cảm âm nên không dùng lại được.

Để sau (backlog): ghép PR #12, PR #14, tuner qua micro, nhạc nền / lặp A-B / giảm tốc, nhật ký tập.

## Thực thi song song: phiên này điều phối, 4 subagent làm
Phiên chính giữ vai **điều phối**. Mỗi tính năng giao cho một subagent (`general-purpose`, `isolation: "worktree"`). Cả 4 chạy cùng lúc, mỗi subagent có worktree riêng và một nhánh riêng **cắt từ `main`**:

| Subagent | Nhánh | Phạm vi file chính |
|---|---|---|
| D | `feat/breath-marks` | `parse.ts`, nhánh breath trong `NoteToken`, `EXAMPLES` trong SongEditor |
| A | `feat/sax-instruments` | `transpose.ts` (preset), `range.ts` mới, `TransposeSettings.tsx`, shift + gạch đỏ trong `TextNotation.tsx`, `Stage.tsx`, `MetronomePanel.tsx` |
| B | `feat/song-key` | `shared/types.ts`, `validation.ts`, `db.ts`, hàm key thêm cuối `transpose.ts`, field Tone trong SongEditor, chip trên header Stage, `Library.tsx`, nút chủ âm trong `MetronomePanel.tsx` |
| C | `feat/sax-fingering` | `src/lib/sax/*` mới, các component thế bấm mới, prop `onNoteClick` (TextNotation → StageContent → BookView), nút bật/tắt trong `Stage.tsx` |

**Hợp đồng để giảm xung đột khi chạy song song:**
- Mọi nhánh chỉ **thêm**, không đổi tên hay xoá export đang có. Prop mới đều là tuỳ chọn.
- **B** không viết `resolveShift`. B thêm prop `songKey?: string` cho `TextNotation`/`StageContent`/`BookView` và dùng `keyMajorPc(songKey) ?? detectKeyPc(sections)` ngay chỗ đang gọi `detectKeyPc`. Khi merge, phiên điều phối gộp vào `resolveShift` của A.
- **B** chỉ sửa tối thiểu `TransposeSettings.tsx`: một prop tuỳ chọn `notice?: string` và một dòng hiển thị. A giữ nguyên các prop hiện có của component này, chỉ thêm prop mới.
- **C** không phụ thuộc A. `fingeringFor` trả `null` khi ngoài tầm. Callback là `onNoteClick(written: NoteValue, concert: NoteValue, el: HTMLElement)`: nốt viết là `v` đang hiển thị, nốt concert là token gốc `t`.
- **A** và **B** cùng sửa `MetronomePanel.tsx` (dòng "Trên kèn…" và nút "Chủ âm của bài"), mỗi bên chèn một khối riêng ở cuối section drone.
- Cả 4 nhánh commit **cùng một file** `docs/plans/2026-11-20-sax-toolkit.md` (nội dung y hệt, phiên điều phối đưa sẵn). Git gộp được các bản thêm giống nhau mà không xung đột.

**Mỗi subagent phải làm (theo CLAUDE.md):**
1. `npm install` trong worktree.
2. Code đúng quy ước:
   - Code, comment, tên file, key localStorage viết tiếng Anh; chữ hiển thị trên UI viết tiếng Việt.
   - localStorage chỉ đi qua `src/lib/prefs.ts`; không thêm thư viện state.
3. Viết test, rồi chạy `npm test`, `npm run typecheck`, `npm run build`, cả ba phải qua.
4. Commit nhiều lần nhỏ:
   - Theo dạng `type(scope): subject`, tiếng Anh, thể mệnh lệnh.
   - Cuối mỗi commit có dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - Không commit vào `main`.
5. `git push -u origin <nhánh>`, rồi `gh pr create --base main`:
   - Title theo dạng conventional.
   - Body ghi tóm tắt và cách test, cuối body có `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
   - **Không merge, không release/deploy, không xoá nhánh.**
6. Không tự bật dev server: hai cổng 5173/5174 và D1 local dùng chung, chạy song song sẽ đụng nhau.
7. Báo lại: số PR, các commit, file đã đổi, kết quả test, chỗ chưa chắc chắn (nhất là bảng thế bấm).

**Phiên điều phối làm:**
- Lưu nội dung plan vào scratchpad để đưa cho subagent, rồi khởi chạy 4 subagent trong cùng một lượt.
- Khi từng subagent xong:
  - Đọc diff của PR.
  - Kiểm tra bằng trình duyệt **lần lượt từng nhánh** trong checkout chính: `git switch --detach origin/<nhánh>`, rồi preview `dev` 5173 và `studio` 5174 (dev login), thử theo mục Kiểm tra bên dưới, chụp màn hình.
  - Xong thì `git switch main`.
  - Có lỗi thì gửi subagent đó sửa tiếp bằng SendMessage.
- **Kiểm tra tích hợp:**
  - Tạo worktree tạm ở chế độ detached (không tạo nhánh mới), merge cả 4 nhánh vào đó.
  - Ghi lại xung đột và cách giải.
  - Chạy `npm test` + `typecheck` + `build` trên bản đã gộp.
  - Xem trình duyệt lần cuối với cả 4 tính năng cùng bật.
- Báo bạn: link 4 PR, ảnh chụp, xung đột dự kiến.
- **Khi bạn OK:**
  - Merge lần lượt D → A → B → C bằng `gh pr merge <n> --merge`.
  - Trước mỗi PR sau, merge `main` vào nhánh đó và giải xung đột theo bản tích hợp đã thử (commit `merge: sync main into <branch>`), chạy lại test.
  - Cuối cùng `git checkout main && git pull` → `npm run release -- minor`.

---

## D. Dấu lấy hơi (`feat/breath-marks`)
- `src/lib/notation/parse.ts`:
  - Thêm loại token `{ type: "breath"; text: string }`.
  - `tokenizeNotes`: chữ đứng riêng `V` / `v` / `𝄒` thành `breath`.
  - `isNoteLine`: không tính từ lấy hơi vào mẫu số của ngưỡng 60%, và vẫn cần ít nhất 1 nốt.
- `src/components/stage/TextNotation.tsx` (`NoteToken`): thêm nhánh `breath` **trước** nhánh nốt. Hiện chữ V nhỏ, chỉ số trên, màu `text-primary`, có `title`/`aria-label="Lấy hơi"`. Dịch giọng không đụng tới token này.
- `studio/src/routes/SongEditor.tsx`: thêm `V` vào ví dụ "Cảm âm" trong `EXAMPLES` và một dòng gợi ý "V = chỗ lấy hơi".
- Test `parse.test.ts`:
  - `"Sol La V Si"` có token breath.
  - Dòng chỉ có `V` không phải dòng nốt.
  - Từ "V" trong lời bài không bị ảnh hưởng.

## A. Loại kèn + tầm âm (`feat/sax-instruments`)
**`src/lib/notation/transpose.ts`**
- Thêm `HornPreset = "concert" | "soprano" | "alto" | "tenor" | "baritone" | "custom"` và bảng `HORN_PRESETS`:

  | Preset | Bán cung | Giọng | Nhãn badge |
  |---|---|---|---|
  | soprano | 2 | Bb | Sop |
  | alto | 9 | Eb | Alto |
  | tenor | 2 | Bb | Tenor |
  | baritone | 9 | Eb | Bari |

  Bảng này thay cho `TRANSPOSE_PRESETS`.
- `TransposeSetting` thêm `preset?: HornPreset` và `autoOctave?: boolean`.
- `normalizeTranspose` vẫn đọc được dữ liệu cũ: 9 thành `alto`, 2 thành `tenor`, 0 thành `concert`, còn lại là `custom`. Dữ liệu cũ đặt `autoOctave` = false để giữ nguyên quãng tám bạn đã chọn.
- `transposeBadge` dùng nhãn của preset.

**Mới: `src/lib/notation/range.ts`**
- `SAX_WRITTEN_RANGE = { low: -2, high: 30 }`, tức Sib0..Fa#3, tính theo bán cung từ Do1 bằng `noteToSemitone`.
- `noteSpan(sections)` trả về `{ min, max, count }`, chỉ xét token `note`.
- `countOutOfRange(sections, semitones, octave)`.
- `bestOctave(sections, semitones)` chọn trong `{-1, 0, 1}`:
  1. ít nốt ngoài tầm nhất;
  2. hoà thì ít nốt cực (cao hơn Do#3 dùng phím palm, hoặc thấp hơn Re1) nhất;
  3. vẫn hoà thì chọn 0.
- `resolveShift(setting, sections, keyPc)` trả về `{ semitones, octave, spelling, range? }`:
  - Octave tự động khi `autoOctave` và preset là sax.
  - `range` chỉ có khi preset là sax.
  - `TextNotation` hiện đang tự tính shift (`TextNotation.tsx:107`); phần này chuyển sang hàm này.

**`src/components/stage/Stage.tsx`**
- `useMemo(parseNotation(song.textContent))`, rồi tính shift đã resolve và tóm tắt tầm âm.
- Truyền shift đã resolve xuống `StageContent` → `TextNotation` và `BookView`. Prop `transpose` đổi kiểu sang shift đã resolve.

**`TextNotation.tsx`**
- Nhận shift đã resolve.
- Nốt ngoài `range` hiện gạch chân lượn sóng màu `destructive`, `title="Ngoài tầm kèn (Sib0–Fa#3)"`.

**`src/components/stage/TransposeSettings.tsx`**
- Mục "Loại kèn": Concert, Alto sax (Mib), Tenor sax (Sib), Soprano sax (Sib), Baritone sax (Mib).
- "Tuỳ chỉnh" vẫn dùng Stepper, preset là `custom`, dành cho trumpet/clarinet…
- Quãng tám có thêm lựa chọn "Tự động (đang: Hạ 1)", mặc định khi chọn kèn sax. Bấm Hạ/Giữ/Nâng thì `autoOctave` = false.
- Dòng tóm tắt tầm âm, chỉ với sax và bài có cảm âm: "Tầm nốt trên kèn: Re1 → Mi3, vừa tầm" hoặc "3 nốt ngoài tầm, đã gạch đỏ trong bài".

**`src/components/stage/MetronomePanel.tsx`**
- Nhận thêm shift.
- Khi preset khác concert, dưới tiêu đề drone hiện: "Trên kèn alto: Fa♯" (nốt concert đang chọn + bán cung, viết theo spelling).

**Test**
- `transpose.test.ts`: normalize dữ liệu cũ, preset, badge.
- `range.test.ts` mới:
  - Biên Sib0 / Fa#3.
  - Bài Do1–Do3 với alto chọn được octave hợp lý.
  - Hoà điểm thì ưu tiên 0.

## B. Tone gốc (`feat/song-key`)
**Dữ liệu** (không cần migration, vì `settings_json` là JSON)
- `shared/types.ts`: thêm `SongSettings.key?: string` (vd "C", "Am", "F#m", "Bb") và `SongSummary.key?: string`.
- `shared/server/validation.ts`: thêm `key: z.string().regex(/^[A-G][#b]?m?$/).optional()` vào `settingsSchema` (đang `.strict()`).
- `shared/server/db.ts` `toSummary`: thêm `key` lấy từ `parseSettings(r.settings_json)`. Câu SELECT trong list đã lấy `s.*` nên không phải sửa.

**`transpose.ts`**
- `keyMajorPc(key)`: tone thứ thì lấy giọng trưởng song song, dùng cho spelling.
- `guessKeyName(sections)`: lấy hợp âm đầu, trả về "Am" hoặc "C".
- `transposeKeyName(key, semitones, spelling)`: dùng lại `transposeChord`, vd "Am" +9 → "F#m".
- Prop mới `songKey?: string` truyền qua `StageContent`/`BookView` tới `TextNotation`, nơi spelling dùng `keyMajorPc(songKey) ?? detectKeyPc(sections)`. Khi gộp với A, phần này chuyển vào `resolveShift`.

**Studio `SongEditor.tsx`**
- Field "Tone gốc" gồm 2 select: nốt gốc (12 nốt) và Trưởng/Thứ, kèm "Không rõ".
- Có nút gợi ý "Đoán từ hợp âm: Am".
- Lưu vào `settings.key`, làm theo cách field BPM đang làm.

**Stage header**
- Cạnh tên ca sĩ hiện "Tone Am"; khi chọn kèn hiện "Tone Am · Alto: F♯m".
- Bài dạng ảnh có `key` cũng hiện nút Giọng kèn. Popover ẩn phần quãng tám/tầm âm và ghi chú "Ảnh không dịch nốt được, chỉ hiện tone cho kèn".

**Drone**
- Có `key` thì thêm nút "Chủ âm của bài", đặt `droneNote` = pc của tone.

**Library `SongCard`**
- Thêm chip nhỏ "Am" cạnh loại bài.

**Test**
- validation: nhận "F#m", từ chối "H", "Cmaj".
- `transposeKeyName` và `keyMajorPc`.
- spelling đúng khi bài chỉ có cảm âm nhưng có `key`.

## C. Thế bấm (`feat/sax-fingering`)
**Mới: `src/lib/sax/fingering.ts`**
- `SaxKey` gồm: `octave`, `palmD`, `palmEb`, `palmF`, `frontF`, `l1`, `bis`, `l2`, `l3`, `gSharp`, `lowCSharp`, `lowB`, `lowBb`, `r1`, `r2`, `r3`, `sideE`, `sideC`, `sideBb`, `highFSharp`, `lowEb`, `lowC`.
- `FINGERINGS` ánh xạ bán cung viết (−2..30) sang `{ keys, alts? }`. `fingeringFor(semi)` trả về fingering hoặc `null`.

Bảng thế bấm. Các mục ⚠ phải đối chiếu với ít nhất 2 bảng (WFG, Yamaha hoặc Tomplay) trước khi ship:

| Nốt viết | Bấm |
|---|---|
| Sib0 | 6 lỗ + lowBb ⚠ (có thêm lowC không?) |
| Si0 | 6 lỗ + lowB ⚠ |
| Do1 | 6 lỗ + lowC |
| Do#1 | 6 lỗ + lowCSharp ⚠ |
| Re1 | 6 lỗ (l1 l2 l3 r1 r2 r3) |
| Mib1 | 6 lỗ + lowEb |
| Mi1 | l1 l2 l3 r1 r2 |
| Fa1 | l1 l2 l3 r1 |
| Fa#1 | l1 l2 l3 r2 |
| Sol1 | l1 l2 l3 |
| Sol#1 | l1 l2 l3 gSharp |
| La1 | l1 l2 |
| Sib1 | l1 bis; cách khác: l1+r1, l1+sideBb |
| Si1 | l1 |
| Do2 | l2; cách khác: l1+sideC |
| Do#2 | không bấm phím nào |
| Re2 → Do#3 | octave + thế bấm của nốt thấp hơn 1 quãng tám (Do#3 = chỉ octave) |
| Re3 | octave palmD |
| Mib3 | octave palmD palmEb |
| Mi3 | octave palmD palmEb sideE |
| Fa3 | octave palmD palmEb sideE palmF |
| Fa#3 | Fa3 + highFSharp ⚠ (ghi chú: cần kèn có phím Fa# cao) |

**Mới: `src/components/stage/SaxFingeringDiagram.tsx`**
- SVG dọc, tự vẽ, không thêm thư viện:
  - phím octave;
  - cụm palm 3 phím + front F;
  - l1, bis, l2, l3;
  - bàn pinky trái (G#, C#, B, Bb);
  - cột phím cạnh phải (E, C, Bb, F#);
  - r1, r2, r3;
  - pinky phải (Eb, C).
- Phím đang bấm tô `fill` màu chữ, phím mở chỉ có viền.
- `aria-label` bằng tiếng Việt liệt kê các phím bấm.

**Mới: `src/components/stage/FingeringPopover.tsx`**
- Một Popover điều khiển dùng chung, `PopoverAnchor` đặt `fixed` theo `getBoundingClientRect` của nốt vừa chạm.
- Nội dung:
  - tên nốt viết thật lớn;
  - "Âm thanh thật: … (concert)" khi đang dịch giọng;
  - sơ đồ;
  - các cách bấm khác (nếu có);
  - "Ngoài tầm kèn" khi `fingeringFor` trả `null`;
  - nút "Xem bảng thế bấm".
- Nút đó mở **`FingeringChartDialog`**: Dialog dạng lưới, đủ 33 nốt, có sơ đồ nhỏ.

**Nối vào `TextNotation` / `StageContent` / `BookView`**
- Prop `onNoteClick?(written: NoteValue, concert: NoteValue, el: HTMLElement)`.
- Khi có prop này, `NoteToken` render thành `<button>` gạch chân chấm, `onClick` gọi `e.stopPropagation()` để không kích hoạt chạm chạy/lật trang ở `Stage.onTap`.

**`Stage.tsx`**
- Nút "Thế bấm" (lucide `Hand`) trong cụm `tools`, chỉ hiện khi bài có dòng cảm âm.
- Lưu bật/tắt trong `gm:fingering` qua `src/lib/prefs.ts`.
- Lần đầu bật thì hiện toast "Chạm vào nốt để xem thế bấm".
- `usePedalKeys` tắt khi popover hoặc dialog đang mở (giống `transposeOpen`).

**Test** `fingering.test.ts`
- Đủ mục cho −2..30, không có mục nào ngoài tầm.
- Kiểm tra mẫu: Sol1, Re2 = octave + 6 lỗ, Do#2 rỗng.
- Không có phím trùng trong một thế bấm.

---

## Tái sử dụng
- `noteToSemitone`, `semitoneToNote`, `transposeNote`, `transposeChord`, `resolveSpelling`, `detectKeyPc` trong `src/lib/notation/transpose.ts`.
- `parseNotation` và `matchNote` trong `parse.ts`.
- `readPref` / `writePref` trong `src/lib/prefs.ts`.
- `Choice` trong `BookSettings.tsx`, `Stepper` trong `TransposeSettings.tsx`.
- `Popover`/`PopoverAnchor`/`Dialog` trong `src/components/ui`, `IconBtn` trong `Stage.tsx`, `sonner` toast.
- Cách field BPM lưu settings trong `SongEditor.tsx`.

## Kiểm tra (theo CLAUDE.md)
Mỗi nhánh:
1. Chạy `npm test`, `npm run typecheck`, `npm run build`, cả ba phải qua.
2. Bật preview `dev` (5173) và `studio` (5174), dùng dev login, rồi kiểm tra trên trình duyệt:
   - **D:** thêm `V` vào bài cảm âm trong Studio, rồi thấy dấu lấy hơi trên Stage ở cả chế độ Cuộn và Sách.
   - **A:** chọn Alto rồi Tenor, thấy quãng tám tự động. Bài có nốt cao thì nốt bị gạch đỏ và dòng tóm tắt báo số nốt ngoài tầm. Popover drone hiện tên nốt trên kèn. Pref cũ `{semitones: 9}` vẫn đọc đúng thành Alto.
   - **B:** đặt tone Am trong Studio, rồi thấy chip trên thẻ thư viện. Stage hiện "Tone Am · Alto: F♯m". Bài ảnh có tone cũng xem được tone cho kèn. Nút "Chủ âm của bài" hoạt động.
   - **C:** bật Thế bấm, chạm nốt thì popover đúng nốt viết. Chạm ngoài nốt vẫn chạy/lật trang. Mở bảng thế bấm. Phím pedal không chạy khi popover đang mở. Thử ở khổ mobile (`resize_window` mobile) và cả nền sáng/tối.
3. Phiên điều phối chụp màn hình gửi bạn. Subagent đã mở PR, **chưa merge**.
4. Kiểm tra tích hợp cả 4 nhánh trong worktree detached, như mô tả ở mục Thực thi song song.
5. Bạn OK thì merge theo thứ tự D → A → B → C, đồng bộ `main` vào từng nhánh trước khi merge, rồi chạy `npm run release -- minor`.

## Nguồn research
- https://dynamicmusicroom.com/saxophone-transposition-chart/
- https://saxteacheruk.com/tutorials/saxophone-transposition-chart.html
- https://www.radiusmusic.org/study/range-transposition-and-clefs/
- https://bettersax.com/7-amazing-apps-for-saxophone-players-you-probably-didnt-know-existed/
- https://jazzfuel.com/saxophone-apps/
- https://tomplay.com/fingering-charts/saxophone
- https://tunable.pages.dev/instruments/alto-sax/fingering/ (bảng chưa đáng tin hoàn toàn: sai ở Sib1 và Fa#3)
- https://bretpimentel.com/planning-breaths
- https://en.wikipedia.org/wiki/Breath_mark
- https://newzik.com/en/resources-sheet-music-app/how-to-transpose-sheet-music-app
