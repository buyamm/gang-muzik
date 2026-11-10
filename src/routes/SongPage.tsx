import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Stage } from "@/components/stage/Stage";
import { api } from "@/lib/api";
import { NotFound } from "./NotFound";

export function SongPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id) });

  if (q.isPending)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  if (q.isError || !q.data) return <NotFound message={q.error?.message ?? "Không tìm thấy bài"} />;

  return (
    <>
      <title>{`${q.data.title} · Gang Muzik`}</title>
      <Stage key={q.data.id} song={q.data} />
    </>
  );
}
