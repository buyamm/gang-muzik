import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { api } from "@studio/lib/api";
import { SongTable } from "@studio/components/SongTable";
import { PageHeader, QueryFallback } from "@studio/components/PageHeader";
import { useMe } from "@studio/hooks/useMe";

export function MySongs() {
  const { user } = useMe();
  const q = useQuery({ queryKey: ["songs", "mine"], queryFn: () => api.listSongs({ scope: "mine" }) });
  return (
    <div className="space-y-6">
      <title>Bài của tôi · Gang Muzik Studio</title>
      <PageHeader
        title={`Xin chào${user?.name ? `, ${user.name}` : ""}!`}
        description={
          <>
            Tạo bài → bấm <b>Gửi duyệt</b> → bài lên thư viện công khai khi quản trị viên duyệt.
          </>
        }
        actions={<Button href="/songs/new" variant="primary" label="Bài mới" icon={<Icon icon={Plus} />} />}
      />
      {q.isSuccess ? (
        <SongTable songs={q.data} empty="Bạn chưa có bài nào. Bấm “Bài mới” để bắt đầu." />
      ) : (
        <QueryFallback error={q.error} />
      )}
    </div>
  );
}
