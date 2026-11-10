#!/usr/bin/env bash
# Release lên production + gắn tag git.
#   npm run release            # tăng patch: 0.2.0 -> 0.2.1
#   npm run release -- minor   # 0.2.1 -> 0.3.0
#   npm run release -- major
set -euo pipefail
BUMP="${1:-patch}"

die() { echo "✘ $*" >&2; exit 1; }
step() { echo; echo "▶ $*"; }

step "Kiểm tra trạng thái git"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "Phải đứng ở nhánh main"
[ -z "$(git status --porcelain)" ] || die "Còn thay đổi chưa commit — commit trước rồi release"
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "main chưa đồng bộ với origin/main (push/pull trước)"

step "Quét secret trong các commit chưa release"
LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
RANGE="${LAST_TAG:+$LAST_TAG..}HEAD"
if git diff ${LAST_TAG:-$(git hash-object -t tree /dev/null)} HEAD -- . ':(exclude)package-lock.json' ':(exclude,glob)**/worker-configuration.d.ts' ':(exclude)scripts/release.sh' \
  | grep '^+' | grep -v '^+++' \
  | grep -nE 'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}|sk-ant-|xox[baprs]-|AIza[0-9A-Za-z_-]{35}|BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(ADMIN_PIN|JWT_SECRET)=[^<]|[A-Fa-f0-9]{40,}'; then
  die "Phát hiện chuỗi giống secret ở trên — kiểm tra lại trước khi release"
fi
git ls-tree -r --name-only HEAD | grep -E '(^|/)\.dev\.vars$|(^|/)\.env|\.wrangler/|\.pem$|\.key$' && die "Có file nhạy cảm trong repo"
echo "  sạch ($RANGE)"

step "Typecheck + test + build (site công khai + Studio)"
npm run typecheck --silent
npm test --silent
npm run build --silent >/dev/null

step "Kiểm tra cấu hình production an toàn"
for cfg in dist/gang_muzik/wrangler.json studio/dist/gang_muzik_studio/wrangler.json; do
  [ -f "$cfg" ] || die "Thiếu $cfg sau khi build"
  grep -q '"DEV_AUTH"' "$cfg" && die "$cfg có DEV_AUTH — đăng nhập giả không được phép lên production"
done
grep -q '"GOOGLE_CLIENT_ID": ""' studio/wrangler.jsonc && echo "  ⚠ GOOGLE_CLIENT_ID còn trống — Studio sẽ chưa đăng nhập Google được"
echo "  ok"

step "Tăng version ($BUMP) + tạo tag"
VERSION="$(npm version "$BUMP" -m "release: v%s")"
echo "  $VERSION"

undo() {
  echo "✘ $1 — huỷ tag và commit version"
  git tag -d "$VERSION" >/dev/null
  git reset -q --hard HEAD~1
  exit 1
}

step "Migration D1 production (an toàn: chỉ chạy migration chưa áp dụng)"
npx wrangler d1 migrations apply gang-muzik --remote || undo "Migration lỗi"

step "Deploy site công khai"
npx wrangler deploy || undo "Deploy site công khai lỗi"

step "Deploy Studio"
(cd studio && npx wrangler deploy) || undo "Deploy Studio lỗi (site công khai ĐÃ được deploy — chạy lại release sau khi sửa)"

step "Push commit + tag"
git push origin main
git push origin "$VERSION"
echo; echo "✔ Đã release $VERSION"
