import { useQuery } from "@tanstack/react-query";
import { api } from "@studio/lib/api";
import { SongsTable } from "@studio/components/SongsTable";

export function Review() {
  const q = useQuery({
    queryKey: ["songs", "all", "pending"],
    queryFn: () => api.listSongs({ scope: "all", status: "pending" }),
  });
  return (
    <SongsTable
      title="Chờ duyệt"
      description="Mở từng bài để xem trước, rồi Duyệt hoặc Từ chối (kèm lý do)."
      query={q}
      showOwner
      empty={{
        title: "Không có bài nào đang chờ duyệt",
        description: "Bài mới gửi sẽ hiện ở đây.",
      }}
    />
  );
}
