import { z } from "zod";

export const settingsSchema = z
  .object({
    mode: z.enum(["scroll", "pages"]).optional(),
    durationSec: z.number().min(5).max(3600).optional(),
    scrollSpeed: z.number().min(1).max(1000).optional(),
    fontScale: z.number().min(0.5).max(4).optional(),
    pageSeconds: z.number().min(1).max(600).optional(),
    bpm: z.number().min(20).max(400).optional(),
  })
  .strict();

export const songSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional(),
  instrument: z.string().trim().max(100).optional(),
  kind: z.enum(["sheet", "text"]),
  textContent: z.string().max(100_000).optional(),
  settings: settingsSchema.optional(),
});

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
