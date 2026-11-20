# Quy trình làm việc cố định + 3 tính năng luyện sax

## Context
Bạn phải nhắc lại cùng một số quy tắc mỗi lần code (lưu plan, commit convention, không xoá branch, tự chạy local để kiểm tra, duyệt xong thì tự merge và deploy). Memory hiện có (`conventional-commits`, `keep-branches-after-merge`) chưa đủ mạnh. Ta đưa toàn bộ quy trình vào **`CLAUDE.md`** vì file này được nạp bắt buộc vào mọi phiên, mọi subagent và mọi worktree, và được commit vào repo. Không làm thành skill, vì skill chỉ chạy khi được gọi nên dễ bị bỏ qua.

Sau đó áp dụng ngay quy trình này cho 3 tính năng sax đã nghiên cứu (kết quả nghiên cứu sẽ lưu thành file ở bước 1).

## Bước 1 — Thêm quy trình vào `CLAUDE.md` (nhánh `chore/workflow-rules`)
Thêm mục mới `## Quy trình làm việc (bắt buộc, không cần nhắc)` vào `/Users/ly.truong/personal/gang-muzik/CLAUDE.md`:

1. **Lưu plan thành file:** mọi plan được duyệt thì lưu vào `docs/plans/YYYY-MM-DD-<slug>.md` và commit cùng nhánh tính năng. Plan cập nhật khi phạm vi thay đổi.
2. **Commit convention:** `type(scope): subject` (feat, fix, refactor, style, chore, docs, test, perf, build, ci; scope gợi ý: stage, library, studio, notation, audio, db, ui). Subject ngắn, thể mệnh lệnh. Mỗi tính năng làm trên một nhánh riêng `feat/<slug>`, không commit thẳng `main`.
3. **Không xoá branch:** merge bằng `gh pr merge <n> --merge`, không bao giờ dùng `--delete-branch`, không xoá nhánh local hay remote trừ khi bạn yêu cầu.
4. **Xong tính năng thì tự chạy local:** chạy `npm test` + `npm run typecheck`, rồi bật dev server bằng preview (`.claude/launch.json`: `dev` cổng 5173, `studio` cổng 5174). Chạy migration local nếu có migration mới, tự kiểm tra bằng trình duyệt, gửi ảnh chụp, rồi báo bạn kiểm tra. Mở PR nhưng **chưa merge**.
5. **Bạn đồng ý thì tự merge + deploy:** khi bạn nói đồng ý/OK trong chat cho PR đó: `gh pr merge <n> --merge` → `git checkout main && git pull` → `npm run release` (patch mặc định; `minor` khi có tính năng mới, hỏi nếu không rõ). Thay đổi chỉ gồm docs hoặc cấu hình thì merge, không release. Release lỗi thì dừng và báo, không deploy tay.

Đồng thời lưu kết quả nghiên cứu sax vào `docs/plans/2026-11-17-sax-research.md`. Cập nhật 2 memory cũ để trỏ về quy trình trong `CLAUDE.md`, tránh trùng lặp.
Mở PR → bạn duyệt → merge (không release vì chỉ là docs).

## Bước 2 — 3 tính năng sax (theo quy trình trên)
Phiên chính chỉ điều phối. Mỗi tính năng do một subagent làm trong worktree riêng, trên nhánh riêng, và có PR riêng.

**A. `feat/transpose` — dịch giọng Eb/Bb**
- Mới: `src/lib/notation/transpose.ts`: nốt → nửa cung (thêm thăng/giáng `#`/`b` vào model `parse.ts`), dịch cảm âm và hợp âm. Hợp âm giữ căn cột: `row.chords` là chuỗi thô, bù hoặc cắt khoảng trắng. Có `[hợp âm chèn]`. Viết test trong `transpose.test.ts`.
- `TextNotation.tsx`: `NoteToken` dựng nhãn từ `note`+`octave`+dấu thay vì `t.text` khi đang dịch giọng.
- `Stage.tsx`: Popover "Giọng kèn" (C / Bb / Eb / tuỳ chỉnh ±nửa cung) trong cụm `tools`, chỉ hiện khi có nhạc dạng chữ. Lưu vào `ViewPrefs` (`gm:song:{id}`) và một pref chung cho nhạc cụ mặc định. Truyền xuống qua `StageContent` và `BookView`.

**B. `feat/metronome-drone` — metronome + drone**
- Mới: `src/lib/audio/engine.ts` (một AudioContext dùng chung, hẹn giờ click theo lookahead, oscillator drone), hook `src/hooks/useMetronome.ts` và `src/hooks/useDrone.ts`.
- `Stage.tsx`: Popover "Nhịp & drone" gồm BPM (dùng `settings.bpm` có sẵn), số phách, bật/tắt, và nốt drone. Có thể dùng đếm ngược để gõ count-in. Thêm `bpm` vào `saveDefaults` và vào Studio `SongEditor.tsx`. Thêm điều kiện dialog vào `usePedalKeys`.

**C. `feat/practice-scales` — luyện tập cùng gam** (cắt từ nhánh tích hợp A+B sau khi A và B được duyệt)
- Route `/luyen-tap` (`src/App.tsx`, `src/routes/Practice.tsx`), link từ `Library.tsx`, SEO trong `shared/seo.ts` + `worker/seo.ts` + `run_worker_first`.
- `src/lib/practice/scales.ts`: tạo gam (trưởng, thứ tự nhiên/hoà âm, ngũ cung, blues) ở mọi tone, hiện bằng cảm âm theo giọng kèn (dùng `transpose.ts`). Viết test.
- UI: tô sáng từng nốt chạy theo metronome (lên rồi xuống), chỉnh BPM, phát nốt mẫu / drone chủ âm (dùng `engine.ts`), và chế độ long tones (giữ N phách).

A và B chạy song song vì chúng chỉ đụng chung `Stage.tsx` ở cụm `tools`; khi merge sẽ có xung đột nhỏ, phiên chính xử lý. C chạy sau.

## Kiểm tra
- Mỗi nhánh: `npm test`, `npm run typecheck`, `npm run build` đều qua. Dùng preview `dev` để mở một bài có cảm âm + hợp âm: đổi giọng Eb/Bb, bật metronome/drone, vào `/luyen-tap`. Chụp màn hình gửi bạn.
- Bước 1: mở phiên mới, kiểm tra quy trình được làm theo mà không cần nhắc.
