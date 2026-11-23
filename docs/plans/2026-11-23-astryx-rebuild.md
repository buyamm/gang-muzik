# Rebuild the whole UI from scratch on Astryx templates

## Context
PR #24 (`feat/astryx-redesign`, not merged) swapped shadcn for Astryx, but each page kept its old layout. The user wants a completely new interface, "as if the old one never existed": every page starts from an Astryx page template (`npx astryx build` → `npx astryx template …`), keeps the template's frame, gap and padding, and only the content is ours. Behavior, data, routes, API and the music core stay the same.

Agreed with the user:
- **Public site frame:** an app with a side nav (AppShell + SideNav), matching Studio.
- **Home:** go straight into the library (Astryx `library` template), plus a small row of shortcuts to Fingering and Practice. No big hero.
- **Song page (Stage):** new frame (top bar, transport bar, settings as a `settings-sidebar` panel); note rendering, scroll/flip, pedal and countdown logic stay as they are.

Work continues on `feat/astryx-redesign` (PR #24). This plan is saved as `docs/plans/2026-11-23-astryx-rebuild.md`.

## Kept as is (logic, not looks)
- `src/components/stage/Stage.tsx` state and hooks, `BookView.tsx`, `StageContent.tsx`, `TextNotation.tsx`, `SongNotes.tsx` (NotesBox), fingering diagrams, `src/lib/**`, `shared/**`, workers, API clients, `usePedalKeys`, `useWakeLock`, `useFullscreen`, `useTheme` / `usePalette`, `src/theme/*` (themes, providers, Vietnamese catalog, Neutral/Matcha picker).
- Routes and URLs (`/`, `/s/:id`, `/fingering`, `/practice`, `/privacy`, `/terms`; Studio `/`, `/songs/new`, `/songs/:id`, `/songs/:id/preview`, `/review`, `/all`, `/users`, `/login`).
- All UI text stays Vietnamese; the existing copy is reused where it still fits.

## New structure

### 1. Shared public frame: `src/components/AppFrame.tsx` (new, replaces `SiteHeader`)
Template: `AppShell - Side Nav Only`.
- `AppShell` + `SideNav`. Header: `SideNavHeading` (logo + "Gang Muzik").
- Items: Thư viện, Thế bấm, Luyện gam. The footer area holds "Đóng góp bài" (to Studio), the "Giao diện" popover (`ThemeToggle`) and legal links (Điều khoản, Quyền riêng tư).
- Mobile: the AppShell mobile nav drawer.
- `SiteFooter` / `CompactFooter` shrink into this side nav footer plus a one-line footer at the end of the content.
- Every public page except the Stage renders inside `AppFrame`.

### 2. Library (`/`): `src/routes/Library.tsx`
Template: `library`, scaffolded with `npx astryx template library --type page` into scratch, then adapted.
- `Layout` header: `Heading` "Thư viện" and a one-line description. A shortcut row of two `ClickableCard`s (Tra thế bấm, Luyện gam).
- Toolbar row: search `TextInput`; instrument `ToggleButtonGroup` (Tất cả / Saxophone / Sáo / Nhạc cụ khác + counts); kind `DropdownMenu` (Tất cả / Dạng chữ / Ảnh); `OverflowList` for the other-instrument chips.
- Content: `Section`s per instrument with uniform `Card` tiles in a `Grid` (motif, title, artist, Tokens). The result count sits in a `Center` `Text`. A real `EmptyState` covers "no match" and "empty library".
- Kept: `?instrument=` URL param and `src/lib/library/tabs.ts` helpers. `SongCard` stays exported for the Studio preview.

### 3. Song page / Stage: `src/components/stage/*`
Not a template page (full-screen reader), built from Astryx parts:
- **Top bar:** `Toolbar` with back `IconButton`, title/artist/key, a Cuộn/Sách `SegmentedControl`, a Cài đặt button and a hide-bars button.
- **Transport bar:** `Toolbar` with duration stepper, prev / play (large primary `IconButton`) / next, and progress (`ProgressBar` for scroll, page counter for book).
- **Settings:** a full-height `Drawer` laid out as the `settings-sidebar` template. A `LayoutPanel` list of sections (Nhạc cụ, Hiển thị, Luyện tập, Thiết bị) swaps the pane beside it; rows edit in place (`Switch`, `SegmentedControl`, steppers). On phones the section list becomes a `TabList` at the top. Existing panels (`TransposePanel`, `MetronomeControls`, `BookLayoutPanel`) are restyled to match.
- Fingering popover, chart dialog, notes dialog and key-map dialog get the `Dialog`/`DialogHeader`/`Layout` pattern already used.

### 4. Fingering (`/fingering`): `src/routes/Fingering.tsx`
Template: `documentation-design` (reference page with a live preview).
- `Layout` with a `start` `LayoutPanel` holding the controls: instrument `SegmentedControl`, horn/flute `Selector`, and the note picker grouped by octave.
- Content: a big note header (name, concert pitch, Nghe âm mẫu / Sao chép liên kết), the standard fingering as the hero `Card`, alternates in a `Grid`, and a `Banner` note for warnings.
- Phones: the panel moves above the content.

### 5. Practice (`/practice`): `src/routes/Practice.tsx`
Template: `settings-sidebar` turned around: the exercise is the main pane and settings live in the side panel.
- Main: mode `TabList` (Âm giai / Nốt dài), the exercise `Card` (title, beat dots / long-tone display, note chips), and a large start/stop button.
- Side `LayoutPanel`: settings grouped under section `Heading`s (Nhịp độ, Chủ âm, Loại gam, Bài tập, Quãng tám, Kiểu chạy, Âm thanh). Reuses `PracticeControls.tsx` pieces.
- Phones: the panel collapses into a "Cài đặt bài tập" `BottomSheet`, with the start button pinned at the bottom.

### 6. Legal (`/privacy`, `/terms`): `src/routes/Legal.tsx`
Template: `documentation`-style article inside `AppFrame`, with `Heading`s and `Text`, and an on-page `List` of sections.

### 7. 404: `EmptyState` centered inside `AppFrame`.

### 8. Studio
- **Frame** (`studio/src/components/Layout.tsx`): template `AppShell - Side Nav Only`, the same shape as the public frame for consistency. User avatar menu and logout go in the side nav footer; "Mở thư viện" and "Giao diện" sit in the footer icons.
- **Bài của tôi / Tất cả bài / Chờ duyệt** (`MySongs`, `AllSongs`, `Review`): template `table-grouped`. A `Table` with columns Tên bài, Nhạc cụ, Dạng, Người đăng (admin), Cập nhật, Trạng thái, grouped by status with counts, plus a search `TextInput` and a primary "Bài mới" button in the header. A row click opens the editor. `SongTable.tsx` is replaced by a shared `SongsTable.tsx`.
- **Người dùng** (`Users`): template `table-simple`. A `Table` with avatar, name, email, role/ban `Badge`s, counts, last login and a row action (Khoá / Mở khoá with `AlertDialog`).
- **Soạn bài** (`SongEditor`): template `editor`, a two-pane workspace.
  - Side panel `TabList`: **Thông tin** (title, artist, instruments, note, kind, key, BPM, duration, font scale), **Nội dung** (text editor with sample buttons, or the image uploader), **Duyệt** (status, review note, approve / reject / unpublish; admin only, or read-only status for contributors).
  - Live canvas on the right: library card preview plus the rendered `TextNotation` (or page images).
  - Header `Toolbar`: back, title, status `Badge`, Xem trước, Lưu / Gửi duyệt (primary), delete.
- **Login**: template `login-card` (Google button, dev login form, legal links).
- **Preview** (`/songs/:id/preview`): unchanged, it renders the Stage.

## Approach
1. For each page, scaffold its template into the scratchpad (`npx astryx template <name> --type page <scratch>/x.tsx`), read it, and rebuild our page on its frame (keeping its gap/padding). Never copy demo data. Read every component with `npx astryx component <Name>` before using it.
2. Order: `AppFrame` → Library → Stage frame and settings → Fingering → Practice → Legal/404 → Studio frame → songs table → users → editor → login.
3. Delete what no longer has a caller (`SiteHeader.tsx`, old `SongTable.tsx`, unused footer bits, `PageHeader.tsx` if replaced). Keep `src/lib/utils.ts` `cn` (still used by music components).
4. `@heroicons/react` is not added: the templates use it, but we keep lucide icons through `<Icon icon={…} />`.
5. Update `CLAUDE.md` Frontend notes and save this plan to `docs/plans/2026-11-23-astryx-rebuild.md`.

## Verification
- `npm test`, `npm run typecheck`, `npm run build`, `npx astryx doctor --built dist` all pass.
- Browser check (preview `dev` 5173, `studio` 5174) at desktop and mobile width, light and dark, Neutral and Matcha:
  - Library: search, instrument filter, kind filter, `?instrument=guitar` deep link, empty state.
  - Song page: scroll and book modes, play/pause, countdown, page turn by keys, settings panel sections, transpose, fingering popover, chart dialog, notes, key map, light paper stage.
  - Fingering: switch instrument / type / note, play tone, copy link.
  - Practice: start/stop, change settings, mobile bottom sheet.
  - Studio (local dev login): song tables with groups and search, editor tabs, save, image upload, preview, review actions with confirmations, users ban dialog (cancel), login page.
- Send screenshots, commit on `feat/astryx-redesign`, push, and update the PR #24 description. Do not merge.
