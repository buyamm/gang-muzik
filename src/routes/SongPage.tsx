import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Stage } from "@/components/stage/Stage";
import { api } from "@/lib/api";
import { NotFound } from "./NotFound";
import { useSeo } from "@/lib/seo";
import { songSeo } from "@shared/seo";

export function SongPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id) });
  useSeo(q.data ? songSeo(q.data) : null);

  if (q.isPending)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  if (q.isError || !q.data) return <NotFound message={q.error?.message ?? "Không tìm thấy bài"} />;

  return (
<Stage key={q.data.id} song={q.data} />
  );
}
