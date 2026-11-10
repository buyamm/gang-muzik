import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAdmin() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 60_000 });
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (d) => qc.setQueryData(["me"], d),
  });
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: (d) => qc.setQueryData(["me"], d),
  });
  return { isAdmin: me.data?.admin ?? false, login, logout };
}
