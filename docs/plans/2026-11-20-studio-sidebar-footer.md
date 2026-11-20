# Studio dùng sidebar + dòng bản quyền ở footer

## Mục tiêu
- Studio (trang quản trị) chuyển menu từ thanh ngang trên cùng sang **sidebar** bên trái, dễ thêm mục mới và rõ mục đang chọn.
- Thêm thông tin bản quyền người làm trang vào footer của **cả thư viện công khai và Studio**.

## Thiết kế
- **Thông tin người làm** (`src/lib/links.ts`): hằng `CREATOR_NAME`, `CREATOR_URL` (đổi ở một chỗ).
- **`SiteCredit`** (`src/components/SiteCredit.tsx`, mới): dòng `© <năm> Gang Muzik. Làm bởi <tên>` (tên là link mở tab mới). Năm lấy theo đồng hồ máy người xem, bắt đầu từ 2026 (`2026–<năm nay>` khi đã sang năm mới).
- **Thư viện** (`src/routes/Library.tsx`): thêm `SiteCredit` vào footer hiện có. Trang Điều khoản / Quyền riêng tư (`src/routes/Legal.tsx`) cũng có footer nhỏ với `SiteCredit`.
- **Studio layout** (`studio/src/components/Layout.tsx`):
  - Màn hình ≥ `lg`: sidebar cố định rộng 15rem bên trái, gồm logo + tên, menu (icon + nhãn + badge số bài chờ duyệt), phía dưới là "Mở thư viện", nút sáng/tối, thẻ người dùng + đăng xuất. Nội dung chính nằm bên phải.
  - Màn hình nhỏ: thanh trên cùng có nút mở menu (☰) + logo; menu trượt ra từ trái (Radix Dialog), đóng khi chọn mục hoặc bấm ra ngoài / Esc.
  - Cuối vùng nội dung có footer với `SiteCredit`.
- **Trang đăng nhập Studio** (`studio/src/routes/Login.tsx`): `SiteCredit` dưới thẻ đăng nhập.

## File
- `src/lib/links.ts`, `src/components/SiteCredit.tsx` (mới)
- `src/routes/Library.tsx`, `src/routes/Legal.tsx`
- `studio/src/components/Layout.tsx`, `studio/src/routes/Login.tsx`

## Kiểm tra
- `npm test`, `npm run typecheck`, `npm run build`.
- Trình duyệt: Studio desktop (sidebar, mục đang chọn, badge chờ duyệt, đăng xuất), mobile (mở/đóng menu, chọn mục); footer có dòng bản quyền ở thư viện, trang Điều khoản, Studio, trang đăng nhập; sáng/tối.
