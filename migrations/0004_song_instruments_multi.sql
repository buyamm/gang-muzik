-- Một bài có thể dùng cho nhiều nhạc cụ: lưu danh sách id cách nhau bằng dấu phẩy, vd "guitar,flute".
-- Cột `instrument` cũ giữ lại (không còn ghi) để worker bản cũ vẫn chạy trong lúc release.
ALTER TABLE songs ADD COLUMN instruments TEXT NOT NULL DEFAULT '';
UPDATE songs SET instruments = instrument WHERE instrument != '';
