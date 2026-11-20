# Đợt 3: học sax + sáo trúc — bỏ dấu lấy hơi, trang Thế bấm, ngăn cài đặt Stage

> Khi duyệt: lưu thành `docs/plans/2026-11-20-sax-sao-learning.md`, commit cùng nội dung trên mọi nhánh của đợt này.

## Context
Sau đợt 2 (PR #16–#19 đã merge, chưa release), bạn yêu cầu bốn việc:

1. **Bỏ tính năng dấu lấy hơi** (PR #16).
2. **Thêm trang riêng để tra thế bấm của một nốt.** Một nốt có thể bấm nhiều cách, nên phải hiện đủ các cách.
3. **Chuyển cả trang sang chủ yếu dạy saxophone và sáo.** Bạn đã chọn:
   - loại sáo: **sáo trúc 6 lỗ**;
   - phạm vi: **sax + sáo là chính, vẫn giữ các nhạc cụ khác**;
   - **gộp luôn PR #12** (trang `/practice` luyện gam).
4. **Thanh điều khiển của Stage có quá nhiều icon**, khó biết nút nào làm gì. Bạn chọn gom thành **một nút Cài đặt mở bảng trượt ra**.

Kết quả khảo sát:
- **Stage:** thanh công cụ có 11 nút. Mỗi nút chỉ có `title`, chưa có tooltip hay nhãn chữ (`Stage.tsx:421-486`). Trên điện thoại cả cụm này dồn xuống footer.
- **Sáo:** code chưa có gì riêng cho sáo, chỉ có id `flute` ("Sáo") trong danh sách nhạc cụ.
- **Thế bấm sáo trúc 6 lỗ:** bịt kín 6 lỗ ra Đô1. Mở dần các lỗ từ lỗ 6 lên lần lượt ra Rê, Mi, Fa, Sol, La, Si. Cây sáo được gọi tên theo nốt thấp nhất (sáo Đô có tầm Đô1–Đô3). Nguồn: unica.vn, cungtapnhac.com, hocthoisao.com.
- **Bảng thế bấm sax:** chỉ có cách bấm phụ cho Sib và Do (`src/lib/sax/fingering.ts`).

## Thực thi: song song 5 subagent, phiên này điều phối
Quy tắc vẫn như đợt trước. Mỗi việc một subagent `general-purpose` chạy trong worktree riêng, một nhánh riêng và một PR riêng (chưa merge).

**Subagent làm:**
- `npm install`.
- Code, comment và commit viết tiếng Anh; chữ trên UI viết tiếng Việt.
- Đọc/ghi localStorage chỉ qua `src/lib/prefs.ts`.
- Thay đổi theo kiểu chỉ thêm, prop mới đều tuỳ chọn.
- Test, `typecheck` và `build` đều phải qua.
- Commit dạng `type(scope): subject`, có dòng Co-Authored-By.
- Push, rồi `gh pr create --base main`. Body PR kết thúc bằng dòng 🤖.
- **Không** merge, không release, không xoá nhánh, không bật dev server.

**Phiên điều phối làm:**
- Đọc diff từng PR, rồi kiểm tra trên trình duyệt lần lượt từng nhánh (dùng server 5173/5174 đang chạy từ checkout chính, chuyển bằng `git switch --detach`).
- Gộp thử cả 5 nhánh trong một worktree tạm ở chế độ detached, bật `rerere` để ghi lại cách giải xung đột, và làm các bước nối liên nhánh ở mục **I** bên dưới.
- Báo bạn kèm ảnh chụp. Bạn đồng ý thì merge, rồi hỏi trước khi release.

| # | Nhánh | Việc |
|---|---|---|
| 1 | `revert/breath-marks` | Bỏ dấu lấy hơi |
| 2 | `feat/stage-settings-drawer` | Ngăn cài đặt Stage |
| 3 | `feat/sao-fingering` | Sáo trúc + trang `/fingering` (cả sax và sáo, đủ cách bấm) |
| 4 | `feat/practice-scales` (PR #12 có sẵn) | Cập nhật theo `main` mới |
| 5 | `feat/sax-sao-focus` | Đổi định hướng site + nav |

### 1. Bỏ dấu lấy hơi (`revert/breath-marks`)
Gỡ bằng tay, **không** dùng `git revert` cả merge, vì merge đó còn chứa file plan.
- `parse.ts`: bỏ token `breath` và `isBreathMark`; đưa nhánh `tokenizeNotes` và bộ lọc của `isNoteLine` về như cũ.
- `TextNotation.tsx`: bỏ nhánh `breath`.
- `parse.test.ts`: bỏ khối "breath marks" (dòng 123–158) và các import không còn dùng.
- `studio/src/routes/SongEditor.tsx`: bỏ `V` khỏi `EXAMPLES` và bỏ câu gợi ý.
- Ghi chú vào `docs/plans/2026-11-20-sax-toolkit.md` rằng mục D đã gỡ.

### 2. Ngăn cài đặt Stage (`feat/stage-settings-drawer`)
**Component**
- Thêm Sheet bên phải, thử theo thứ tự:
  1. `npx shadcn@latest add @animate-ui/components-radix-sheet`;
  2. nếu không có thì `npx shadcn@latest add sheet`.
- Mới: `src/components/stage/SettingsDrawer.tsx`.

**Header còn lại:**
- nút quay lại, tên bài + dòng tone;
- công tắc Cuộn/Sách;
- nút **"Cài đặt"** có cả icon lẫn chữ. Nút này hiện chip trạng thái nhỏ: badge giọng kèn ("Alto"), chấm khi metronome đang chạy, "Thế bấm" khi đang bật;
- nút Ẩn thanh.

Footer trên điện thoại bỏ hàng `tools`, chỉ giữ cụm Chạy, Thời lượng và Trang.

**Ngăn cài đặt** rộng `min(92vw, 400px)`, chia mục, mỗi mục có tiêu đề. Mỗi dòng gồm icon, nhãn chữ và mô tả ngắn:
- **Nhạc cụ:**
  - Giọng kèn/sáo hiện thẳng trong ngăn, không qua popover nữa.
  - Công tắc **Thế bấm**, mô tả "Chạm vào nốt để xem cách bấm".
- **Hiển thị:**
  - Cỡ chữ (− 100% +).
  - Tô màu nốt.
  - Nền sáng/tối.
  - Ghi chú: mở `NotesDialog`.
  - Kiểu sách: hiện thẳng nội dung `BookSettings`, chỉ ở chế độ Sách.
- **Luyện tập:** Nhịp & drone hiện thẳng trong ngăn.
- **Thiết bị:**
  - Pedal & phím tắt.
  - Toàn màn hình.
  - Lưu làm mặc định (chỉ trong Studio).

**Tách phần ruột khỏi nút bấm**, giữ export cũ để không gãy chỗ khác:
- `TransposeSettings.tsx` thành `TransposePanel` + trigger.
- `MetronomePanel.tsx` thành `MetronomeControls` + trigger.
- `BookSettings.tsx` thành `BookLayoutPanel`.

**Hành vi**
- Danh sách giọng kèn phải lấy từ `HORN_PRESETS` (render generic), để preset mới tự xuất hiện.
- `usePedalKeys` tạm tắt khi ngăn đang mở.
- Phím tắt mở ngăn: phím `S`. Thêm vào `KeyMapDialog` dưới dạng chữ hướng dẫn.

### 3. Sáo trúc + trang Thế bấm (`feat/sao-fingering`)
**Preset sáo** (`transpose.ts`)
- `HornPresetInfo` thêm `family: "concert" | "sax" | "sao" | "custom"`. Giữ `sax` boolean để tương thích.
- Thêm preset theo tên cây sáo, thứ tự: sáo Đô, Rê, Mi, Fa, Sol, La, Sib.
  - `semitones` = −(cao độ chủ âm của sáo), đặt trong khoảng −6..+5.
  - Ví dụ: sáo Rê = −2, sáo Sol = +5.
  - Quãng tám chọn tự động.
- Badge: "Sáo Rê"…

**Tầm âm** (`range.ts`)
- `rangeFor(preset)`: sax là −2..30 như hiện tại; sáo 6 lỗ là Đô1–Đô3, tức 0..24.
- `resolveShift`, `bestOctave` và `summarizeRange` dùng `rangeFor`.

**Dữ liệu thế bấm sáo**: mới `src/lib/sao/fingering.ts`
- Tính theo nốt viết, tương đối với cây sáo, 0..24.
- Trạng thái từng lỗ: `"closed" | "half" | "open"`, 6 lỗ.
- Nốt nửa cung dùng bịt nửa lỗ (half-hole).
- Quãng 2 và quãng 3 dùng thổi mạnh hoặc cách bấm riêng.
- Mỗi nốt có `alts` (các cách bấm khác) và `note` ghi cách thổi (nhẹ/mạnh).
- **Phải đối chiếu ít nhất 2 nguồn tiếng Việt** (unica.vn, cungtapnhac.com, hocthoisao.com, saotruchoanganh.com…). Ghi nguồn ở đầu file và trong body PR.
- Ghi rõ những nốt chưa chắc (đặc biệt quãng 3 và các nửa cung).

**Diagram sáo**: `src/components/fingering/SaoFingeringDiagram.tsx`
- Ống ngang có 6 lỗ.
- Lỗ bịt tô kín, lỗ hở để viền, lỗ bịt nửa tô nửa.

**Bổ sung cách bấm phụ cho sax** (`src/lib/sax/fingering.ts`)
- Thêm F#, Mi3/Fa3 bấm front F, Do#2, Sol#… và mỗi cách kèm mô tả khi nào dùng.
- Nếu cần thì thêm phím mới vào `SaxKey` và vào diagram.
- Nguồn: ít nhất 2 bảng (Bret Pimentel, Yamaha, Tomplay, WFG nếu truy cập được).

**Popover trong Stage**
- Chọn diagram theo `family` của preset đang dùng.
- Preset concert/custom thì dùng pref `gm:learn-instrument` (sax hoặc sáo, mặc định sax).

**Mới: trang `/fingering`** (`src/routes/Fingering.tsx`)
- Chọn nhạc cụ: Saxophone / Sáo trúc 6 lỗ.
- Chọn loại:
  - sax: Alto, Tenor, Soprano, Baritone;
  - sáo: Đô, Rê…
  - Loại này chỉ dùng để hiện **âm thật (concert)**.
- Bàn chọn nốt: các ô cảm âm theo quãng, có cả ♯/♭.
- Khi chọn nốt:
  - Diagram lớn của **cách bấm chính** và **mọi cách bấm phụ** đặt cạnh nhau, mỗi cách có nhãn + mô tả khi dùng.
  - Nút nghe âm mẫu (`playTone` trong `src/lib/audio/engine.ts`, đúng cao độ concert).
- URL chia sẻ được: `/fingering?i=sax&t=alto&n=Sib1`.
- SEO:
  - thêm `FINGERING_SEO` vào `shared/seo.ts`;
  - thêm route + sitemap trong `worker/seo.ts`;
  - thêm `/fingering` vào `run_worker_first` trong `wrangler.jsonc`;
  - gọi `useSeo` trong trang.
- Bảng `FingeringChartDialog` trong Stage có thêm link "Mở trang thế bấm".
- Hàm thuần `suggestSaoKey(songKey)`: bài trưởng X thì gợi ý sáo X; bài thứ thì dùng giọng trưởng song song. Có test.

**Test**
- Dữ liệu sáo đủ 0..24, không trùng.
- `rangeFor`.
- Preset sáo, cùng cách dịch và chọn quãng tám cho sáo.
- `suggestSaoKey`.
- Mọi cách bấm phụ của sax hợp lệ.

### 4. Luyện gam (`feat/practice-scales`, PR #12)
- Merge `main` vào nhánh này (bật `rerere`) và giải xung đột. Theo khảo sát chỉ đụng `Library.tsx`, còn lại tự gộp được.
- Đổi sang `HORN_PRESETS` mới:
  - giọng kèn dùng chung pref `gm:transpose`;
  - tầm âm theo `SAX_WRITTEN_RANGE`.
- Bỏ nút "Luyện tập" mà PR này thêm vào header `Library.tsx`, vì nhánh 5 làm nav chung.
- Nếu PR đang có comment/plan còn tiếng Việt trong code thì đổi sang tiếng Anh.
- Cập nhật title và body PR.

### 5. Đổi định hướng: học sax + sáo (`feat/sax-sao-focus`)
**Lời giới thiệu và SEO** (chữ UI tiếng Việt)
- Trỏ về "học & chơi saxophone, sáo trúc" thay cho "mọi nhạc cụ", ở các chỗ:
  - `index.html` (meta);
  - `public/manifest.webmanifest`;
  - `shared/seo.ts` (`DEFAULT_DESCRIPTION`, title trang chủ, JSON-LD);
  - `README.md`;
  - `src/components/SiteFooter.tsx` (đoạn giới thiệu; cột Nhạc cụ đưa Sax và Sáo lên đầu, thêm cột "Học" gồm Thế bấm và Luyện gam);
  - `studio/src/routes/Login.tsx`.

**Nav chung**
- Component mới `src/components/SiteHeader.tsx`: logo · Thư viện · Thế bấm (`/fingering`) · Luyện gam (`/practice`) · Đóng góp bài · ThemeToggle.
- Trên điện thoại: hàng link cuộn ngang, hoặc menu.
- Dùng ở `Library.tsx` và `Legal.tsx`, tức là thay header hiện tại.

**Thư viện**
- Hero mới, ví dụ "Học sax & sáo trúc, bấm chạy là thổi", với 2 nút CTA: Tra thế bấm, Luyện gam.
- Tab nhạc cụ theo thứ tự: Tất cả · **Saxophone** · **Sáo** · **Nhạc cụ khác** (gộp guitar, piano, organ, ukulele, harmonica, violin, other).
- Không đổi dữ liệu, không migration. Link cũ `?instrument=guitar` vẫn chạy và rơi vào nhóm "Nhạc cụ khác".

**Studio `SongEditor`**
- Chip Sax và Sáo đặt đầu.
- Các nhạc cụ còn lại thu vào mục "Nhạc cụ khác" có thể mở ra.

**Test:** cập nhật `shared/seo.test.ts` và test nhóm tab nếu tách thành hàm thuần.

### I. Nối liên nhánh (phiên điều phối làm trong worktree tích hợp, rồi đưa vào nhánh khi merge)
- Ngăn cài đặt (2) nhóm danh sách preset theo `family` mà nhánh 3 thêm vào: Concert · Saxophone · Sáo trúc · Tuỳ chỉnh.
- Ngăn cài đặt hiện dòng gợi ý "Bài tone Am → dùng sáo Đô" bằng `suggestSaoKey`.
- Trang `/practice` (4) dùng `rangeFor(preset)` của nhánh 3 để luyện gam cho cả sáo.
- Giải xung đột ở `Stage.tsx`/`TextNotation.tsx` (1, 2, 3), `App.tsx`/`seo`/`wrangler.jsonc` (3, 4, 5), `Library.tsx` (4, 5).

## Kiểm tra
Mỗi nhánh: `npm test` + `npm run typecheck` + `npm run build` đều qua. Rồi kiểm tra trên trình duyệt ở khổ desktop **và** mobile:
1. Bài có `V` hiện lại chữ "V" như chữ thường, không còn là dấu lấy hơi.
2. Header Stage chỉ còn vài nút và có nút "Cài đặt" có chữ. Mở ngăn thì thấy đủ các mục có nhãn và mọi chức năng cũ vẫn chạy: giọng kèn, thế bấm, cỡ chữ, màu, nền, ghi chú, kiểu sách, nhịp & drone, pedal, toàn màn hình. Pedal không chạy khi ngăn đang mở.
3. Chọn sáo Rê cho một bài thì nốt dịch đúng; nốt ngoài Đô1–Đô3 bị gạch đỏ; chạm nốt ra diagram sáo. Ở `/fingering`, chọn Sib1 trên sax thấy đủ bis, 1 và 1, phím cạnh; chọn sáo thấy lỗ bịt nửa; nút nghe âm mẫu chạy; link chia sẻ mở đúng nốt.
4. `/practice` chạy với Alto và với sáo Đô (sau bước tích hợp).
5. Trang chủ có hero mới, nav và tab Sax / Sáo / Nhạc cụ khác; link `?instrument=guitar` vẫn chạy; footer và meta đã đổi; `/sitemap.xml` có `/fingering` và `/practice`.

Sau đó gộp thử cả 5 nhánh trong worktree tích hợp và chạy lại test, `typecheck`, `build` cùng các bước trên. Gửi ảnh chụp. Khi bạn OK thì merge theo thứ tự 1 → 2 → 3 → 4 → 5, đồng bộ `main` vào từng nhánh (dùng `rerere` + phần nối liên nhánh). Chỉ release `minor` khi bạn đồng ý.

## Nguồn
- https://unica.vn/blog/cach-bam-cac-not-tren-sao-truc
- https://cungtapnhac.com/bai-viet/sao-truc-can-ban
- https://hocthoisao.com/sao-do-c5-la-gi/
- https://saotruchoanganh.com/gioi-thieu-sao-truc-cac-loai-sao-truc/
- https://www.wikipedia.org/wiki/S%C3%A1o
