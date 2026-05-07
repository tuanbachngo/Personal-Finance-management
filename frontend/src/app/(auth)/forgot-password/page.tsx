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
      alert("Email không được để trống.");
      return;
    }
    if (!recoveryAnswer.trim()) {
      alert("Câu trả lời khôi phục không được để trống.");
      return;
    }
    if (!newPassword.trim()) {
      alert("Mật khẩu mới không được để trống.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    try {
      const res = await requestMutation.mutateAsync({ email: normalizedEmail });
      setOtpMessage(res.message);
      setStage(STAGE_VERIFY);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể gửi OTP."));
    }
  };

  const handleConfirmReset = async () => {
    if (!otpCode.trim()) {
      alert("OTP không được để trống.");
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
      alert(extractApiErrorMessage(error, "Đặt lại mật khẩu thất bại."));
    }
  };

  const resendOtp = async () => {
    try {
      const res = await requestMutation.mutateAsync({ email: normalizedEmail });
      setOtpMessage(res.message);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể gửi lại OTP."));
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <h1 className="text-3xl font-semibold text-text">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-muted">Khôi phục quyền truy cập tài khoản an toàn.</p>

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
                  Gợi ý khôi phục: {hintQuery.data.recovery_hint}
                </div>
              ) : (
                <p className="text-xs text-muted">Tài khoản này chưa có gợi ý khôi phục.</p>
              )
            ) : (
              <p className="text-xs text-muted">Nhập email để tải gợi ý khôi phục.</p>
            )}

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Câu trả lời khôi phục</span>
              <input
                type="password"
                value={recoveryAnswer}
                onChange={(event) => setRecoveryAnswer(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Mật khẩu mới</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Xác nhận mật khẩu mới</span>
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
              Tiếp tục
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
              Bước 2: Xác minh OTP cho <span className="text-text">{normalizedEmail}</span>.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Mã OTP</span>
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
                Xác minh OTP và đặt lại mật khẩu
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={requestMutation.isPending}
                className="focus-ring rounded-md border border-border px-3 py-2 text-sm text-text"
              >
                Gửi lại OTP
              </button>
              <button
                type="button"
                onClick={() => setStage(STAGE_REQUEST)}
                className="focus-ring rounded-md border border-border px-3 py-2 text-sm text-text"
              >
                Quay lại bước 1
              </button>
            </div>
          </div>
        )}

        <Link className="mt-4 inline-block text-sm text-muted underline" href="/login">
          Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}

