"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createUserProfile,
  deleteUserProfile,
  getMetaAccounts,
  getMetaBanks,
  getMetaCategories,
  getMetaUsers,
  getUserProfiles,
  updateUserProfile
} from "@/lib/api-client";

export function useMetaUsersQuery() {
  return useQuery({
    queryKey: ["meta-users"],
    queryFn: getMetaUsers
  });
}

export function useMetaBanksQuery() {
  return useQuery({
    queryKey: ["meta-banks"],
    queryFn: getMetaBanks
  });
}

export function useMetaCategoriesQuery() {
  return useQuery({
    queryKey: ["meta-categories"],
    queryFn: getMetaCategories
  });
}

export function useMetaAccountsQuery(userId?: number) {
  return useQuery({
    queryKey: ["meta-accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });
}

export function useUserProfilesQuery(enabled = true) {
  return useQuery({
    queryKey: ["user-profiles"],
    queryFn: getUserProfiles,
    enabled
  });
}

export function useCreateUserProfileMutation() {
  return useMutation({ mutationFn: createUserProfile });
}

export function useUpdateUserProfileMutation() {
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Parameters<typeof updateUserProfile>[1] }) =>
      updateUserProfile(userId, payload)
  });
}

export function useDeleteUserProfileMutation() {
  return useMutation({ mutationFn: deleteUserProfile });
}

