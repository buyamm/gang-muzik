-- Chuyển cột nhạc cụ từ chữ nhập tự do sang id danh mục (shared/instruments.ts).
-- Thứ tự giống KEYWORDS trong normalizeInstrument; LIKE không phân biệt hoa thường với chữ ASCII.
UPDATE songs SET instrument = CASE
  WHEN TRIM(instrument) = '' THEN ''
  WHEN instrument IN ('guitar', 'piano', 'organ', 'ukulele', 'flute', 'harmonica', 'sax', 'violin', 'other') THEN instrument
  WHEN instrument LIKE '%guitar%' OR instrument LIKE '%ghi ta%' OR instrument LIKE '%ghita%' OR instrument LIKE '%bass%' THEN 'guitar'
  WHEN instrument LIKE '%piano%' OR instrument LIKE '%keyboard%' THEN 'piano'
  WHEN instrument LIKE '%organ%' OR instrument LIKE '%phím%' THEN 'organ'
  WHEN instrument LIKE '%ukulele%' OR instrument LIKE '%uke%' THEN 'ukulele'
  WHEN instrument LIKE '%sáo%' OR instrument LIKE '%sao%' OR instrument LIKE '%flute%' OR instrument LIKE '%recorder%' THEN 'flute'
  WHEN instrument LIKE '%harmonica%' THEN 'harmonica'
  WHEN instrument LIKE '%sax%' THEN 'sax'
  WHEN instrument LIKE '%violin%' OR instrument LIKE '%vĩ cầm%' OR instrument LIKE '%cello%' THEN 'violin'
  ELSE 'other'
END;

CREATE INDEX IF NOT EXISTS idx_songs_instrument ON songs(instrument);
