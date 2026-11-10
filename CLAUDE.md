# Gang Muzik

Web xem sheet nhạc / cảm âm rảnh tay (tự cuộn, tự lật trang, pedal Bluetooth) cho người chơi mọi nhạc cụ (guitar, piano, sáo, sax, violin…).

## Kiến trúc
- **Một Cloudflare Worker** (`worker/index.ts`, Hono) phục vụ cả SPA (Workers Static Assets, `dist/client`) và `/api/*`.
- **D1** (`DB`): bảng `songs`, `pages`, `login_attempts` — migration trong `migrations/`.
- **R2** (`BUCKET`): ảnh trang, key `songs/{songId}/{pageId}.{ext}`, phục vụ qua `/api/files/*` (cache immutable).
- **Auth**: chỉ admin ghi. `ADMIN_PIN` + `JWT_SECRET` (secret) → cookie JWT `gm_admin`. Đọc công khai.
- Kiểu dùng chung FE/BE: `shared/types.ts`.

## Frontend
- Vite + React 19 + Tailwind v4 + shadcn/ui (`src/components/ui`) + Animate UI (`src/components/animate-ui`).
- Sáng/tối toàn site: `src/hooks/useTheme.ts` (localStorage `gm:theme`, script chống nháy trong `index.html`).
- Theme: biến CSS kiểu tweakcn trong `src/index.css` (đổi theme: `npx shadcn@latest add https://tweakcn.com/r/themes/<id>.json`).
- Thêm component Animate UI: `npx shadcn@latest add @animate-ui/<component>` (vd `@animate-ui/components-radix-tabs`).
- Lõi: `src/components/stage/Stage.tsx` (chế độ Cuộn & Sách, đếm ngược, wake lock, pedal), `BookView.tsx` (nhiều trang cạnh nhau, lăn chuột/vuốt để lật),
  `src/lib/notation/parse.ts` (parser nhạc dạng chữ: cảm âm, hợp âm, [hợp âm chèn], tab), `src/lib/stage/math.ts` (tốc độ, chia trang).
- Tốc độ cuộn / tự lật đều suy ra từ **thời lượng bài** (`durationSec`). Người xem chỉnh → localStorage `gm:song:{id}`; admin bấm "Lưu" → ghi vào `songs.settings_json`.

## Lệnh
- `npm run dev` — Vite + Worker + D1/R2 local; quản trị tại `/admin` (PIN dev trong `.dev.vars`)
- `npm run db:migrate:local` — chạy migration local (lần đầu)
- `npm test` · `npm run typecheck` · `npm run build`
- `npm run deploy` — build + `wrangler deploy`
- Sau khi đổi `wrangler.jsonc`: `npm run cf-typegen`

## Quy ước
- Tiếng Việt cho mọi chuỗi UI.
- localStorage chỉ qua `src/lib/prefs.ts` (không throw).
- Không thêm thư viện state; dùng TanStack Query cho dữ liệu server.
