# Gang Muzik 🎷

Thư viện sheet nhạc, cảm âm, hợp âm, tab **rảnh tay** cho mọi nhạc cụ: tự cuộn theo thời lượng bài, chế độ sách tự lật trang, điều khiển bằng pedal Bluetooth / phím / lăn chuột. Admin upload, bạn bè chỉ cần link để xem.

## Chạy local
```bash
npm install
cp .dev.vars.example .dev.vars   # rồi điền ADMIN_PIN, JWT_SECRET cho bản local
npm run db:migrate:local
npm run dev            # http://localhost:5173 — quản trị: /admin
```

## Deploy lên Cloudflare (một lần)
```bash
npx wrangler login
npx wrangler d1 create gang-muzik          # chép database_id vào wrangler.jsonc
npx wrangler r2 bucket create gang-muzik-files
npm run db:migrate:remote
npx wrangler secret put ADMIN_PIN          # mã PIN quản trị
npx wrangler secret put JWT_SECRET         # chuỗi ngẫu nhiên dài, vd: openssl rand -hex 32
npm run deploy
```
Các lần sau chỉ cần `npm run deploy`.

## Điều khiển khi chơi
| | Chế độ Cuộn | Chế độ Sách |
|---|---|---|
| Pedal phải / → ↓ PageDown | Chạy / dừng | Lật tới |
| Pedal trái / ← ↑ PageUp | Tua lại một đoạn | Lật lùi |
| Space / Enter | Chạy / dừng | Bật / tắt tự lật |
| Chạm màn hình | Chạy / dừng | Trái: lùi · Phải: tới · Giữa: chạy/dừng |
| Lăn chuột / touchpad / vuốt | Cuộn tay | Lật trang |

Gán lại phím cho pedal: nút ⌨ trong màn hình xem.
