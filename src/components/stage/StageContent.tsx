import { memo } from "react";
import type { Song } from "@shared/types";
import { TextNotation } from "./TextNotation";

/** nội dung bài (ảnh sheet + nhạc dạng chữ). `scale` phóng to/thu nhỏ. */
export const StageContent = memo(function StageContent({
  song,
  scale,
  colored,
  fit = false,
}: {
  song: Song;
  scale: number;
  colored: boolean;
  /** true: chiếm trọn chiều rộng khung (chế độ sách) */
  fit?: boolean;
}) {
  return (
    <div className="text-stage-fg" style={{ fontSize: `${scale * 1.25}rem` }}>
      {song.pages.length > 0 && (
        <div className="mx-auto flex flex-col gap-2" style={fit ? undefined : { maxWidth: `${Math.round(scale * 900)}px` }}>
          {song.pages.map((p, i) => (
            <img
              key={p.id}
              data-break
              src={p.url}
              width={p.width}
              height={p.height}
              alt={`${song.title} — trang ${i + 1}`}
              draggable={false}
              decoding="async"
              className="block h-auto w-full select-none bg-white"
            />
          ))}
        </div>
      )}
      {song.textContent.trim() && (
        <div className={song.pages.length ? (fit ? "pt-6" : "pt-10") : ""}>
          <TextNotation text={song.textContent} colored={colored} compact={fit} />
        </div>
      )}
    </div>
  );
});
