"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { extractApiErrorMessage, requestUnlockOtp, verifyUnlockOtp } from "@/lib/api-client";

const requestSchema = z.object({
  email: z.string().email("Email is invalid.")
});
const verifySchema = z.object({
  email: z.string().email("Email is invalid."),
  otp_code: z.string().min(1, "OTP is required.")
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
      alert(extractApiErrorMessage(error, "Failed to send OTP."));
    }
  });

  const submitVerify = verifyForm.handleSubmit(async (values) => {
    try {
      const res = await verifyMutation.mutateAsync(values);
      alert(res.message);
    } catch (error) {
      alert(extractApiErrorMessage(error, "Failed to verify OTP."));
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <h1 className="text-3xl font-semibold text-text">Verify Unlock OTP</h1>
        <p className="mt-2 text-sm text-muted">
          Use this flow when account is temporarily locked after failed logins.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <form onSubmit={submitRequest} className="space-y-3 rounded-md border border-border bg-bg p-4">
            <h2 className="text-lg text-text">Step 1: Request OTP</h2>
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
              Send OTP
            </button>
          </form>

          <form onSubmit={submitVerify} className="space-y-3 rounded-md border border-border bg-bg p-4">
            <h2 className="text-lg text-text">Step 2: Verify OTP</h2>
            <input
              type="email"
              placeholder="Email"
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              {...verifyForm.register("email")}
            />
            <input
              placeholder="OTP code"
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
              {...verifyForm.register("otp_code")}
            />
            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg"
            >
              Verify & Unlock
            </button>
          </form>
        </div>

        <Link className="mt-4 inline-block text-sm text-muted underline" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}

