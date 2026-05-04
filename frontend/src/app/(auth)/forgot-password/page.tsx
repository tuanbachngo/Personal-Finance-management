"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  confirmPasswordReset,
  extractApiErrorMessage,
  getRecoveryHint,
  requestPasswordReset
} from "@/lib/api-client";

const STAGE_REQUEST = "request";
const STAGE_VERIFY = "verify";

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState(STAGE_REQUEST);
  const [email, setEmail] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const normalizedEmail = useMemo(() => email.trim(), [email]);

  const hintQuery = useQuery({
    queryKey: ["recovery-hint", normalizedEmail],
    queryFn: () => getRecoveryHint(normalizedEmail),
    enabled: normalizedEmail.length > 3 && normalizedEmail.includes("@"),
    staleTime: 15000
  });

  const requestMutation = useMutation({ mutationFn: requestPasswordReset });
  const confirmMutation = useMutation({ mutationFn: confirmPasswordReset });

  const handleRequestOtp = async () => {
    if (!normalizedEmail) {
      alert("Email cannot be empty.");
      return;
    }
    if (!recoveryAnswer.trim()) {
      alert("Recovery answer cannot be empty.");
      return;
    }
    if (!newPassword.trim()) {
      alert("New password cannot be empty.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New password and confirmation do not match.");
      return;
    }
    try {
      const res = await requestMutation.mutateAsync({ email: normalizedEmail });
      setOtpMessage(res.message);
      setStage(STAGE_VERIFY);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Failed to send OTP."));
    }
  };

  const handleConfirmReset = async () => {
    if (!otpCode.trim()) {
      alert("OTP cannot be empty.");
      return;
    }
    try {
      const res = await confirmMutation.mutateAsync({
        email: normalizedEmail,
        otp_code: otpCode.trim(),
        recovery_answer: recoveryAnswer.trim(),
        new_password: newPassword.trim()
      });
      alert(res.message);
      setStage(STAGE_REQUEST);
      setOtpCode("");
    } catch (error) {
      alert(extractApiErrorMessage(error, "Password reset failed."));
    }
  };

  const resendOtp = async () => {
    try {
      const res = await requestMutation.mutateAsync({ email: normalizedEmail });
      setOtpMessage(res.message);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Failed to resend OTP."));
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <h1 className="text-3xl font-semibold text-text">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted">Recover account access securely.</p>

        {stage === STAGE_REQUEST ? (
          <div className="mt-6 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            {normalizedEmail ? (
              hintQuery.data?.recovery_hint ? (
                <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                  Recovery hint: {hintQuery.data.recovery_hint}
                </div>
              ) : (
                <p className="text-xs text-muted">Recovery hint is not available for this account yet.</p>
              )
            ) : (
              <p className="text-xs text-muted">Enter your email to load recovery hint.</p>
            )}

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Recovery answer</span>
              <input
                type="password"
                value={recoveryAnswer}
                onChange={(event) => setRecoveryAnswer(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-muted">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={requestMutation.isPending}
              className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {otpMessage ? (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                {otpMessage}
              </div>
            ) : null}

            <p className="text-sm text-muted">
              Step 2: Verify OTP for <span className="text-text">{normalizedEmail}</span>.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">OTP code</span>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={confirmMutation.isPending}
                className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
              >
                Verify OTP & Reset Password
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={requestMutation.isPending}
                className="focus-ring rounded-md border border-border px-3 py-2 text-sm text-text"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => setStage(STAGE_REQUEST)}
                className="focus-ring rounded-md border border-border px-3 py-2 text-sm text-text"
              >
                Back to Step 1
              </button>
            </div>
          </div>
        )}

        <Link className="mt-4 inline-block text-sm text-muted underline" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}

