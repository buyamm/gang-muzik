-- Daily counter of AI transcribe calls per user (rate limit for contributors)
CREATE TABLE transcribe_counts (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
