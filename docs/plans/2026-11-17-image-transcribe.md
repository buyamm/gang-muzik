# Image → text notation (transcribe) so transpose works for image songs

## Context
Transpose (`src/lib/notation/transpose.ts`) only works on text notation. Songs of `kind='sheet'` are just images in R2 (`pages` table), so transpose does nothing for them. Users mostly upload **staff notation**, sometimes with cảm âm written underneath, sometimes without.

Goal: in Studio, the uploader presses "Nhận dạng từ ảnh" → Cloudflare Workers AI (vision model) reads each page → returns notation in our existing text grammar (lyrics / cảm âm / chords) → uploader reviews and fixes → saves together with the song (goes through the same review flow). On the public site, a song with both images and text gets a toggle **"Ảnh gốc" / "Bản chữ"**; transpose works in "Bản chữ".

Honest limits (state them in the UI too): output keeps line/order structure of the image, but it is our text format, not a pixel copy. Staff *with* cảm âm underneath → reliable (the model reads the text). Staff *without* cảm âm → the model must read note heads; Workers AI vision models are weak at this, so the result is a draft flagged "cần kiểm tra kỹ", and rhythm/durations are not preserved (our grammar has none).

Branch: `feat/image-transcribe`. Plan saved to `docs/plans/2026-11-17-image-transcribe.md`.

## Backend (Studio worker only — public worker stays GET-only)
1. **Binding:** add `"ai": { "binding": "AI" }` to `studio/wrangler.jsonc`; add var `TRANSCRIBE_MODEL` (default a vision-capable model, e.g. `@cf/meta/llama-4-scout-17b-16e-instruct`; verify availability/quality at implementation time against 2–3 sample images and pick the best of llama-4-scout / gemma-3 / mistral-small-3.1). Run `npm run cf-typegen`.
2. **Route** `POST /api/songs/:id/transcribe` (one downscaled page image per call) in `studio/worker/routes/songs.ts`:
   - Same permission checks as editing the song (`shared/permissions.ts`: owner & not approved, or admin), CSRF middleware already applies.
   - Body: multipart `image` = a downscaled JPEG produced client-side (avoids resizing in the Worker and WebP-support issues). Validate type/size (≤ 2MB) in `shared/server/validation.ts`.
   - Call `env.AI.run(model, { messages: [system, user{text + image}] , max_tokens })`.
   - Return `{ text, hasSolfege: boolean, confidence: 'high'|'low' }` — model is asked to output a fenced block of notation + one marker line saying whether cảm âm text was present on the image; worker strips/parses that.
   - Daily limit for non-admins: new `LIMITS.maxTranscribesPerDay` (e.g. 60) in `shared/permissions.ts`; counter via migration `migrations/0006_transcribe_counts.sql` (`transcribe_counts(user_id, day, count)`, same pattern as `upload_counts`).
3. **Prompt** in `studio/worker/transcribe.ts` (pure function builds prompt + `cleanTranscription(raw)` post-processor):
   - Explain our grammar with the example from `SongEditor.tsx` `EXAMPLES`: lyric line, then note line `Do Re Mi Fa Sol La Si` with octave digit (`Re2`, `La0`), `#`/`b`, separators `- . |`; chord line above lyrics or inline `[Am]`; blank line between systems.
   - Rules: keep one output line per staff system/line in the image, same order; if cảm âm text exists under the staff, copy it exactly; else read staff notes (treble clef, convert to solfège with octave digits relative to C4 = Do1); copy chord symbols; copy lyrics verbatim with Vietnamese diacritics; no commentary.
   - `cleanTranscription`: strip code fences/commentary, normalize note spellings (đô→Do etc. already handled by parser), then run `parseNotation` (`src/lib/notation/parse.ts`) to sanity-check that ≥ some note/chord lines were recognized → else `confidence: 'low'`.

## Studio UI
- `studio/src/routes/SongEditor.tsx`: stop clearing `textContent` for `kind='sheet'` (~line 143). Under `ImageUploader` add a "Bản chữ (để dịch giọng)" section:
  - Button "Nhận dạng từ ảnh" (`studio/src/components/TranscribePanel.tsx`) → for each page in order: load image from `/api/files/...`, canvas-downscale to ≤1600px JPEG (helper next to `prepareImage` in `ImageUploader.tsx`), call new `transcribePage()` in `studio/src/lib/api.ts`, show progress "Trang 2/4…", append results separated by blank lines.
  - If textarea already has content → confirm replacing it.
  - `fixNoteLyricOrder` (shared/transcribe.ts) swaps note-above-lyric pairs: models tend to print notes first, as on paper.
  - Textarea + live preview with existing `TextNotation`; warning badge when `confidence: 'low'` ("Ảnh không có cảm âm, AI đọc khuông nhạc — hãy kiểm tra từng nốt").
- Text is saved via existing `PUT /:id` (`textContent` already in `songSchema`), so it goes through draft → pending → approved like everything else.

## Public viewer
- `src/components/stage/StageContent.tsx`: accept `view: 'image' | 'text'`; when a song has both pages and text render only the chosen one (songs with only one kind unchanged).
- `src/components/stage/Stage.tsx`: when `pages.length && hasText`, show a 2-option toggle "Ảnh gốc / Bản chữ" at the start of the tools group (header on desktop, bottom bar on phones — the header has no room there); the phone tools row now scrolls sideways. Default "Ảnh gốc". Transpose button visible when `hasText`; changing transpose to non-zero auto-switches to "Bản chữ". Remember choice per song in the existing `gm:song:{id}` prefs object (field `view`).
- `BookView.tsx` reuses `StageContent`, so it follows the same `view` prop; page splitting in `src/lib/stage/math.ts` must recompute when view changes (check it keys on content height).
- Library list: optional small badge "Có bản chữ" — skip unless trivial.

## Result of local test (real Workers AI, llama-4-scout)
- Staff + written cảm âm: notes copied correctly; lyric/note order fixed by `fixNoteLyricOrder`.
- Staff only: notes mostly wrong (as expected) → yellow warning shown. Model is a var (`TRANSCRIBE_MODEL`) so it can be swapped later.

## Tests
- `studio/worker/transcribe.test.ts`: `cleanTranscription` (fence stripping, marker parsing, low-confidence detection) with fixed model outputs.
- `src/lib/prefs` / Stage view default logic if extracted to a pure helper.
- Existing `parse`/`transpose` tests stay green.

## Verification
1. `npm test`, `npm run typecheck`, `npm run db:migrate:local`.
2. Note: Workers AI binding always calls the real Cloudflare account even in `wrangler dev` (needs `wrangler login`; small usage cost).
3. `preview_start studio` (5174, DEV_AUTH) → create sheet song, upload a staff+cảm âm image and a staff-only image → "Nhận dạng từ ảnh" → check text, edit, save, submit, approve as admin.
4. `preview_start dev` (5173) → open song → toggle Ảnh gốc/Bản chữ in both Cuộn and Sách modes → transpose +2 → notes/chords shift, view auto-switches. Screenshot both views.
5. Commit with conventional messages, open PR (not merged), report to user.
