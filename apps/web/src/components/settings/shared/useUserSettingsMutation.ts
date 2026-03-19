import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { usersService } from "@/services/users";

export function useUserSettingsMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      usersService.update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });
}
