import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScoreEntry } from "../backend";
import { useActor } from "./useActor";

export function useLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, score }: { name: string; score: number }) => {
      if (!actor) throw new Error("No actor");
      await actor.submitScore(name, BigInt(score));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
