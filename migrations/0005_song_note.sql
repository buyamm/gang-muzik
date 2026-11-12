-- Ghi chú công khai của người đăng (tone, capo, cách chơi...) hiển thị trên đầu bài.
ALTER TABLE songs ADD COLUMN note TEXT NOT NULL DEFAULT '';
