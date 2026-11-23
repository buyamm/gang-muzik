import { useQuery } from "@tanstack/react-query";
import { api } from "@studio/lib/api";
import { SongsTable } from "@studio/components/SongsTable";

export function AllSongs() {
  const q = useQuery({
    queryKey: ["songs", "all", "any"],
    queryFn: () => api.listSongs({ scope: "all" }),
  });
  return (
    <SongsTable
      title="Tất cả bài"
      description="Mọi bài trong Studio, nhóm theo trạng thái duyệt."
      query={q}
      showOwner
      empty={{ title: "Chưa có bài nào" }}
    />
  );
}
