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
- Vite + React 19 + Tailwind v4 + shadcn/ui (`src/components/ui`) + Animate UI (`src/components/animate-ui`).
- Sáng/tối toàn site: `src/hooks/useTheme.ts` (localStorage `gm:theme`, script chống nháy trong `index.html`).
- Theme: biến CSS kiểu tweakcn trong `src/index.css` (đổi theme: `npx shadcn@latest add https://tweakcn.com/r/themes/<id>.json`).
- Thêm component Animate UI: `npx shadcn@latest add @animate-ui/<component>` (vd `@animate-ui/components-radix-tabs`).
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
- Tiếng Việt cho mọi chuỗi UI.
- localStorage chỉ qua `src/lib/prefs.ts` (không throw).
- Không thêm thư viện state; dùng TanStack Query cho dữ liệu server.
