-- Người dùng đăng nhập bằng Google (Studio)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('admin', 'contributor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);
CREATE INDEX idx_users_email ON users(email);

-- Phiên đăng nhập: chỉ lưu SHA-256 của token, không lưu token
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Bài có chủ sở hữu + quy trình duyệt. Bài đang có giữ nguyên trạng thái "đã duyệt".
ALTER TABLE songs ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE songs ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
ALTER TABLE songs ADD COLUMN reviewed_by TEXT;
ALTER TABLE songs ADD COLUMN reviewed_at INTEGER;
ALTER TABLE songs ADD COLUMN submitted_at INTEGER;
CREATE INDEX idx_songs_status ON songs(status, updated_at DESC);
CREATE INDEX idx_songs_owner ON songs(owner_id, updated_at DESC);

-- Đếm lượt tải ảnh mỗi ngày để chống lạm dụng
CREATE TABLE upload_counts (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
