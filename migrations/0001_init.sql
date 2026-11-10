CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  instrument TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('sheet', 'text')),
  text_content TEXT NOT NULL DEFAULT '',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_songs_updated ON songs(updated_at DESC);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL
);
CREATE INDEX idx_pages_song ON pages(song_id, position);

CREATE TABLE login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
