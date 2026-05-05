import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGoal,
  createGoalContribution,
  deleteGoal,
  getGoalProgress,
  getGoals,
  updateGoal
} from "@/lib/api-client";
import type {
  GoalContributionCreateRequest,
  GoalCreateRequest,
  GoalUpdateRequest
} from "@/types/api";

export function useGoals(userId?: number) {
  return useQuery({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: Boolean(userId)
  });
}

export function useGoalProgress(userId?: number) {
  return useQuery({
    queryKey: ["goal-progress", userId],
    queryFn: () => getGoalProgress(userId),
    enabled: Boolean(userId)
  });
}

export function useCreateGoal(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GoalCreateRequest) => createGoal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["goal-progress", userId] });
    }
  });
}

export function useUpdateGoal(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: number; payload: GoalUpdateRequest }) =>
      updateGoal(goalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["goal-progress", userId] });
    }
  });
}

export function useDeleteGoal(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, userId }: { goalId: number; userId: number }) =>
      deleteGoal(goalId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["goal-progress", userId] });
    }
  });
}

export function useCreateGoalContribution(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      goalId,
      payload
    }: {
      goalId: number;
      payload: GoalContributionCreateRequest;
    }) => createGoalContribution(goalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", userId] });
      queryClient.invalidateQueries({ queryKey: ["goal-progress", userId] });
    }
  });
}