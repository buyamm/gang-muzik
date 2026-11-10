import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SongSettings } from "@shared/types";
import { Stage } from "@/components/stage/Stage";
import { useAdmin } from "@/hooks/useAdmin";
import { api, songToInput } from "@/lib/api";
import { NotFound } from "./NotFound";

export function SongPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { isAdmin } = useAdmin();
  const q = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id) });
  const save = useMutation({
    mutationFn: (settings: SongSettings) => api.updateSong(id, { ...songToInput(q.data!), settings }),
    onSuccess: (song) => {
      qc.setQueryData(["song", id], song);
      qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Đã lưu làm mặc định cho bài này");
    },
    onError: (e) => toast.error(e.message),
  });

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
      <Stage key={q.data.id} song={q.data} isAdmin={isAdmin} onSaveDefaults={(s) => save.mutateAsync(s)} />
    </>
  );
}
