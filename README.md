# Gang Muzik 🎷

Thư viện sheet nhạc, cảm âm, hợp âm, tab **rảnh tay** cho mọi nhạc cụ: tự cuộn theo thời lượng bài, chế độ sách tự lật trang, điều khiển bằng pedal Bluetooth / phím / lăn chuột.

Gồm **2 site dùng chung một database (D1) + kho ảnh (R2)**:

| Site | Dành cho | Địa chỉ |
|---|---|---|
| Thư viện (công khai, chỉ đọc) | Mọi người xem & chơi nhạc | https://gang-muzik.lytruong.workers.dev |
| Studio (CMS) | Đăng nhập Google để đóng góp bài; quản trị viên duyệt bài, quản lý người dùng | https://gang-muzik-studio.lytruong.workers.dev |

Quy trình bài: **Nháp → Chờ duyệt → Đã duyệt** (hiện trên thư viện) hoặc **Bị từ chối** (kèm góp ý). Chỉ email trong secret `ADMIN_EMAILS` là quản trị viên.

## Chạy local
```bash
npm install
cp studio/.dev.vars.example studio/.dev.vars   # điền giá trị; DEV_AUTH=1 cho phép đăng nhập thử không cần Google
npm run db:migrate:local
npm run dev          # thư viện  → http://localhost:5173
npm run dev:studio   # Studio    → http://localhost:5174
```

## Cấu hình một lần trên Cloudflare
```bash
npx wrangler login
npx wrangler d1 create gang-muzik               # chép database_id vào wrangler.jsonc và studio/wrangler.jsonc
npx wrangler r2 bucket create gang-muzik-files
npm run db:migrate:remote
```
Đăng nhập Google cho Studio: tạo OAuth client (Web) trên Google Cloud Console với redirect URI
`https://gang-muzik-studio.lytruong.workers.dev/api/auth/google/callback` (và `http://localhost:5174/...` để dev),
điền `GOOGLE_CLIENT_ID` trong `studio/wrangler.jsonc`, rồi đặt secret:
```bash
cd studio
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put ADMIN_EMAILS      # email quản trị viên
npx wrangler secret put COOKIE_SECRET     # chuỗi ngẫu nhiên dài: openssl rand -hex 32
```

## Release lên production
Mỗi lần release được gắn tag `vX.Y.Z` trên git:
```bash
npm run release            # sửa lỗi nhỏ: 0.3.0 -> 0.3.1
npm run release -- minor   # tính năng mới: 0.3.1 -> 0.4.0
```
`scripts/release.sh`: kiểm tra `main` sạch & đồng bộ → quét secret → typecheck + test + build 2 site → chặn nếu cấu hình production có `DEV_AUTH` →
tăng version + tag → migration D1 → deploy thư viện → deploy Studio (lỗi thì tự huỷ tag) → push commit + tag.

## Điều khiển khi chơi
| | Chế độ Cuộn | Chế độ Sách |
|---|---|---|
| Pedal phải / → ↓ PageDown | Chạy / dừng | Lật tới |
| Pedal trái / ← ↑ PageUp | Tua lại một đoạn | Lật lùi |
| Space / Enter | Chạy / dừng | Bật / tắt tự lật |
| Chạm màn hình | Chạy / dừng | Trái: lùi · Phải: tới · Giữa: chạy/dừng |
| Lăn chuột / touchpad / vuốt | Cuộn tay | Lật trang |

Gán lại phím cho pedal: nút ⌨ trong màn hình xem.
