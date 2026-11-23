# Gang Muzik

Web xem sheet nhạc / cảm âm rảnh tay (tự cuộn, tự lật trang, pedal Bluetooth) cho người chơi mọi nhạc cụ (guitar, piano, sáo, sax, violin…).

## Kiến trúc
- **2 Worker, chung D1 `gang-muzik` + R2 `gang-muzik-files`:**
  - Thư viện công khai — `wrangler.jsonc`, `worker/` (Hono, **chỉ GET**, chỉ bài `status='approved'`), UI `src/`.
  - Studio (CMS) — `studio/wrangler.jsonc`, `studio/worker/` (Google OAuth + PKCE, session cookie băm SHA-256 trong D1, CSRF bằng header `x-gm-studio` + Origin), UI `studio/src/`.
- Phân quyền: `shared/permissions.ts` (dùng cho cả API và UI). Admin = email trong secret `ADMIN_EMAILS`; còn lại là contributor.
- Quy trình bài: draft → pending → approved | rejected. Contributor chỉ sửa bài của mình khi chưa duyệt.
- DB helper dùng chung: `shared/server/db.ts`, schema zod: `shared/server/validation.ts`. Migration trong `migrations/`.
- Dev login (`DEV_AUTH=1` trong `studio/.dev.vars`, chỉ localhost) để test không cần Google — tuyệt đối không đặt trên production.

## Frontend
- Vite + React 19 + Tailwind v4 + **Astryx** (`@astryxdesign/core`, theme Neutral mở rộng thành `gang` trong `src/theme/gangTheme.ts` — chỉ đổi font sang Be Vietnam Pro vì Figtree thiếu dấu tiếng Việt). Không còn shadcn/Animate UI.
- Provider chung cho 2 site: `src/theme/Providers.tsx` (i18n `vi-VN` → `Theme` → `LayerProvider` toast → `LinkProvider` qua react-router). Toast: `useToast()`.
- Tra component trước khi dùng: `npx astryx component <Name>` / `npx astryx search "<từ khoá>"`; kiểm tra: `npx astryx doctor`. Hướng dẫn chi tiết ở khối ASTRYX bên dưới.
- CSS: `src/index.css` khai báo thứ tự `@layer` trước mọi import; biến kiểu shadcn (`--background`, `--primary`…) chỉ là alias của token Astryx. Màu riêng của app chỉ có stage + 7 nốt.
- Sáng/tối toàn site: `src/hooks/useTheme.ts` (localStorage `gm:theme`, script chống nháy trong `index.html`) → `mode` của `<Theme>`. Stage tự giữ nền sáng/tối riêng bằng `color-scheme` (`.dark` / `.stage-light`).
- Lõi: `src/components/stage/Stage.tsx` (chế độ Cuộn & Sách, đếm ngược, wake lock, pedal), `BookView.tsx` (nhiều trang cạnh nhau, lăn chuột/vuốt để lật),
  `src/lib/notation/parse.ts` (parser nhạc dạng chữ: cảm âm, hợp âm, [hợp âm chèn], tab), `src/lib/stage/math.ts` (tốc độ, chia trang).
- Tốc độ cuộn / tự lật đều suy ra từ **thời lượng bài** (`durationSec`). Người xem chỉnh → localStorage `gm:song:{id}`; admin bấm "Lưu" → ghi vào `songs.settings_json`.

## Lệnh
- `npm run dev` — thư viện (5173); `npm run dev:studio` — Studio (5174); dùng chung D1/R2 local trong `.wrangler/state`
- `npm run db:migrate:local` — chạy migration local (lần đầu)
- `npm test` · `npm run typecheck` · `npm run build`
- `npm run release [-- minor|major]` — migration + deploy 2 site + tag git (luôn dùng lệnh này, không deploy tay)
- `npm run deploy` — build + `wrangler deploy` (không tạo tag)
- Sau khi đổi `wrangler.jsonc`: `npm run cf-typegen`

## Quy ước
- Tiếng Việt cho mọi chuỗi UI (chữ người dùng nhìn thấy).
- **Code viết bằng tiếng Anh:** tên biến/hàm/type/component, tên file, route/URL (vd `/practice`, không `/luyen-tap`), key localStorage, tên cột/API, comment và commit message. Code cũ còn comment tiếng Việt thì sửa dần khi đụng tới, không cần viết lại hàng loạt.
- localStorage chỉ qua `src/lib/prefs.ts` (không throw).
- Không thêm thư viện state; dùng TanStack Query cho dữ liệu server.

## Quy trình làm việc (bắt buộc, không cần nhắc)
1. **Lưu plan thành file:** plan nào được duyệt thì lưu vào `docs/plans/YYYY-MM-DD-<slug>.md` và commit cùng nhánh tính năng. Đổi phạm vi thì cập nhật plan.
2. **Commit convention:** `type(scope): subject` (feat, fix, refactor, style, chore, docs, test, perf, build, ci; scope ví dụ: stage, library, studio, notation, audio, db, ui). Commit message viết **tiếng Anh**, subject ngắn, thể mệnh lệnh. Mỗi tính năng một nhánh riêng (`feat/<slug>`, `fix/<slug>`…), không commit thẳng `main`.
3. **Không xoá branch:** merge bằng `gh pr merge <n> --merge`, **không bao giờ** `--delete-branch`, không xoá nhánh local/remote trừ khi người dùng yêu cầu.
4. **Xong tính năng thì tự chạy local:** `npm test` + `npm run typecheck` qua; có migration mới thì `npm run db:migrate:local`; bật dev server bằng preview (`.claude/launch.json`: `dev` 5173, `studio` 5174), tự kiểm tra trên trình duyệt, gửi ảnh chụp, rồi báo người dùng kiểm tra. Mở PR nhưng **chưa merge**.
5. **Người dùng đồng ý thì tự merge + deploy:** khi người dùng nói đồng ý/OK cho PR đó trong chat → `gh pr merge <n> --merge` → `git checkout main && git pull` → `npm run release` (mặc định patch; `-- minor` khi có tính năng mới; không rõ thì hỏi). PR chỉ có docs/cấu hình thì merge, không release. Release lỗi thì dừng và báo, không deploy tay.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
