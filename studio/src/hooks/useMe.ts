import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@studio/lib/api";

export function useMe() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 60_000 });
  const user = q.data?.user ?? null;
  return {
    ...q,
    user,
    isAdmin: user?.role === "admin",
    refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
  };
}
