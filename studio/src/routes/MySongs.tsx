import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { api } from "@studio/lib/api";
import { SongsTable } from "@studio/components/SongsTable";

export function MySongs() {
  const q = useQuery({
    queryKey: ["songs", "mine"],
    queryFn: () => api.listSongs({ scope: "mine" }),
  });
  const newSong = <Button href="/songs/new" variant="primary" size="lg" label="Bài mới" icon={<Icon icon={Plus} />} />;
  return (
    <SongsTable
      title="Bài của tôi"
      description="Tạo bài → bấm Gửi duyệt → bài lên thư viện công khai khi quản trị viên duyệt."
      actions={newSong}
      query={q}
      empty={{
        title: "Bạn chưa có bài nào",
        description: "Bấm “Bài mới” để đăng bài đầu tiên.",
      }}
    />
  );
}
