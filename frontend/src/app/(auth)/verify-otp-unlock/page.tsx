"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { extractApiErrorMessage, requestUnlockOtp, verifyUnlockOtp } from "@/lib/api-client";

const requestSchema = z.object({
  email: z.string().email("Email không hợp lệ.")
});
const verifySchema = z.object({
  email: z.string().email("Email không hợp lệ."),
  otp_code: z.string().min(1, "Vui lòng nhập OTP.")
});

type RequestForm = z.infer<typeof requestSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

export default function VerifyOtpUnlockPage() {
  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" }
  });
  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: "", otp_code: "" }
  });

  const requestMutation = useMutation({ mutationFn: requestUnlockOtp });
  const verifyMutation = useMutation({ mutationFn: verifyUnlockOtp });

  const submitRequest = requestForm.handleSubmit(async (values) => {
    try {
      const res = await requestMutation.mutateAsync(values);
      alert(res.message);
      verifyForm.setValue("email", values.email);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể gửi OTP."));
    }
  });

  const submitVerify = verifyForm.handleSubmit(async (values) => {
    try {
      const res = await verifyMutation.mutateAsync(values);
      alert(res.message);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể xác minh OTP."));
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <h1 className="text-3xl font-semibold text-text">Xác minh OTP mở khóa</h1>
        <p className="mt-2 text-sm text-muted">
          Dùng luồng này khi tài khoản bị khóa tạm thời do đăng nhập sai nhiều lần.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <form onSubmit={submitRequest} className="space-y-3 rounded-md border border-border bg-bg p-4">
            <h2 className="text-lg text-text">Bước 1: Yêu cầu OTP</h2>
            <input
              type="email"
              placeholder="Email"
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              {...requestForm.register("email")}
            />
            {requestForm.formState.errors.email ? (
              <p className="text-xs text-danger">{requestForm.formState.errors.email.message}</p>
            ) : null}
            <button
              type="submit"
              disabled={requestMutation.isPending}
              className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
            >
              Gửi OTP
            </button>
          </form>

          <form onSubmit={submitVerify} className="space-y-3 rounded-md border border-border bg-bg p-4">
            <h2 className="text-lg text-text">Bước 2: Xác minh OTP</h2>
            <input
              type="email"
              placeholder="Email"
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              {...verifyForm.register("email")}
            />
            <input
              placeholder="Mã OTP"
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              {...verifyForm.register("otp_code")}
            />
            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
            >
              Xác minh và mở khóa
            </button>
          </form>
        </div>

        <Link className="mt-4 inline-block text-sm text-muted underline" href="/login">
          Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}

