"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  confirmPasswordReset,
  getRecoveryHint,
  login,
  me,
  requestPasswordReset,
  requestUnlockOtp,
  signup,
  verifyUnlockOtp
} from "@/lib/api-client";

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: ["auth-me"],
    queryFn: me,
    enabled
  });
}

export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}

export function useSignupMutation() {
  return useMutation({ mutationFn: signup });
}

export function useRequestUnlockOtpMutation() {
  return useMutation({ mutationFn: requestUnlockOtp });
}

export function useVerifyUnlockOtpMutation() {
  return useMutation({ mutationFn: verifyUnlockOtp });
}

export function useRecoveryHintQuery(email: string, enabled = true) {
  return useQuery({
    queryKey: ["auth-recovery-hint", email],
    queryFn: () => getRecoveryHint(email),
    enabled
  });
}

export function useRequestPasswordResetMutation() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useConfirmPasswordResetMutation() {
  return useMutation({ mutationFn: confirmPasswordReset });
}

