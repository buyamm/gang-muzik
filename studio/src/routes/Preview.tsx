import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Stage } from "@/components/stage/Stage";
import { api } from "@studio/lib/api";

/** xem thử bài đúng như người xem sẽ thấy trên thư viện */
export function Preview() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id) });
  if (q.isPending) return <div className="p-10 text-center text-muted-foreground">Đang tải…</div>;
  if (q.isError || !q.data) return <div className="p-10 text-center text-destructive">{q.error?.message}</div>;
  return (
    <>
      <title>{`Xem thử: ${q.data.title}`}</title>
      <Stage key={q.data.id} song={q.data} backTo={`/songs/${id}`} />
    </>
  );
}
