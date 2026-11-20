# Studio dùng sidebar + dòng bản quyền ở footer

## Mục tiêu
- Studio (trang quản trị) chuyển menu từ thanh ngang trên cùng sang **sidebar** bên trái, dễ thêm mục mới và rõ mục đang chọn.
- Thêm thông tin bản quyền người làm trang vào footer của **cả thư viện công khai và Studio**.

## Thiết kế
- **Thông tin người làm và liên kết** (`src/lib/links.ts`): `CREATOR_NAME`, `CREATOR_URL`, `PUBLIC_URL`, `FEEDBACK_URL` (GitHub issues), khai báo một chỗ.
- **Số phiên bản**: Vite `define` đưa `__APP_VERSION__` từ `package.json` vào cả 2 bản build. `scripts/release.sh` build lại ngay sau `npm version` để bản deploy hiện đúng số phiên bản mới.
- **`SiteFooter`** (`src/components/SiteFooter.tsx`, mới), 2 kiểu:
  - Đầy đủ (thư viện, trang Điều khoản / Quyền riêng tư): cột giới thiệu (logo + một câu mô tả), cột **Nhạc cụ** (link `/?instrument=<id>`), cột **Đóng góp** (Gửi bài, Đăng nhập Studio, Báo lỗi và góp ý), cột **Thông tin** (Điều khoản, Quyền riêng tư). Dưới cùng: `© 2026 Gang Muzik. Bảo lưu mọi quyền. Thiết kế và phát triển bởi <tên>` và `Phiên bản x.y.z`. Năm thành `2026–<năm nay>` khi sang năm mới.
  - Gọn (`CompactFooter`, Studio và trang đăng nhập Studio): một dòng bản quyền + Điều khoản, Quyền riêng tư, Góp ý, phiên bản.
- **Studio layout** (`studio/src/components/Layout.tsx`):
  - Màn hình ≥ `lg`: sidebar cố định rộng 15rem bên trái, gồm logo + tên, menu (icon + nhãn + badge số bài chờ duyệt), phía dưới là "Mở thư viện", nút sáng/tối, thẻ người dùng + đăng xuất. Nội dung chính nằm bên phải.
  - Màn hình nhỏ: thanh trên cùng có nút mở menu (☰) + logo; menu trượt ra từ trái (Radix Dialog), đóng khi chọn mục hoặc bấm ra ngoài / Esc.
  - Cuối vùng nội dung có `CompactFooter`.
- **Trang đăng nhập Studio** (`studio/src/routes/Login.tsx`): `CompactFooter` dưới thẻ đăng nhập.

## File
- `src/lib/links.ts`, `src/components/SiteFooter.tsx` (mới), `src/globals.d.ts` (mới)
- `vite.config.ts`, `vite.studio.config.ts`, `scripts/release.sh`
- `src/routes/Library.tsx`, `src/routes/Legal.tsx`
- `studio/src/components/Layout.tsx`, `studio/src/routes/Login.tsx`

## Kiểm tra
- `npm test`, `npm run typecheck`, `npm run build`.
- Trình duyệt: Studio desktop (sidebar, mục đang chọn, badge chờ duyệt, đăng xuất), mobile (mở/đóng menu, chọn mục); footer có dòng bản quyền ở thư viện, trang Điều khoản, Studio, trang đăng nhập; sáng/tối.
