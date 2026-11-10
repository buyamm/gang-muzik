/**
 * Danh mục nhạc cụ cố định. Cột `songs.instrument` lưu `id` (vd "guitar").
 * Dùng chung cho API (kiểm tra dữ liệu), Studio (chọn) và thư viện (lọc).
 */
export const INSTRUMENTS = [
  { id: "guitar", label: "Guitar" },
  { id: "piano", label: "Piano" },
  { id: "organ", label: "Organ" },
  { id: "ukulele", label: "Ukulele" },
  { id: "flute", label: "Sáo" },
  { id: "harmonica", label: "Harmonica" },
  { id: "sax", label: "Saxophone" },
  { id: "violin", label: "Violin" },
  { id: "other", label: "Khác" },
] as const;

export type InstrumentId = (typeof INSTRUMENTS)[number]["id"];

export const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id) as [InstrumentId, ...InstrumentId[]];

const LABEL = new Map<string, string>(INSTRUMENTS.map((i) => [i.id, i.label]));

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

/** từ khoá nhận diện dữ liệu cũ (nhập tay tự do) */
const KEYWORDS: [InstrumentId, RegExp][] = [
  ["guitar", /guitar|ghi ta|ghita|bass/],
  ["piano", /piano|keyboard/],
  ["organ", /organ|dan phim/],
  ["ukulele", /ukulele|uke/],
  ["flute", /sao|flute|recorder/],
  ["harmonica", /harmonica|ken acmonica/],
  ["sax", /sax/],
  ["violin", /violin|vi cam|cello/],
];

/** Chuẩn hoá về id danh mục; chuỗi rỗng = chưa chọn nhạc cụ. */
export function normalizeInstrument(value: string | null | undefined): InstrumentId | "" {
  const v = strip(value ?? "");
  if (!v) return "";
  if (LABEL.has(v)) return v as InstrumentId;
  return KEYWORDS.find(([, re]) => re.test(v))?.[0] ?? "other";
}

/** "guitar,flute" (cột DB) → ["guitar", "flute"]; bỏ id lạ, chuẩn hoá dữ liệu cũ */
export function parseInstruments(value: string | null | undefined): InstrumentId[] {
  const ids = (value ?? "")
    .split(",")
    .map((v) => normalizeInstrument(v))
    .filter((v): v is InstrumentId => !!v);
  return INSTRUMENTS.map((i) => i.id).filter((id) => ids.includes(id)); // theo thứ tự danh mục, không trùng
}

export function serializeInstruments(ids: readonly string[] | undefined): string {
  return parseInstruments((ids ?? []).join(",")).join(",");
}

export function instrumentLabel(value: string | null | undefined): string {
  const id = normalizeInstrument(value);
  return id ? (LABEL.get(id) ?? "") : "";
}
