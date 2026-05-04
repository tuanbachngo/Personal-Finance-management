"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { extractApiErrorMessage, getMetaBanks, signup } from "@/lib/api-client";

const schema = z.object({
  user_name: z.string().min(1, "User name is required."),
  email: z.string().email("Email is invalid."),
  phone_number: z.string().optional(),
  bank_id: z.number({ invalid_type_error: "Please select a bank." }),
  password: z.string().min(1, "Password is required."),
  recovery_hint: z.string().optional(),
  recovery_answer: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_name: "",
      email: "",
      phone_number: "",
      bank_id: 0,
      password: "",
      recovery_hint: "",
      recovery_answer: ""
    }
  });

  const banksQuery = useQuery({
    queryKey: ["meta-banks-signup"],
    queryFn: getMetaBanks
  });

  const signupMutation = useMutation({
    mutationFn: signup
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signupMutation.mutateAsync({
        ...values,
        phone_number: values.phone_number?.trim() || null,
        recovery_hint: values.recovery_hint?.trim() || null,
        recovery_answer: values.recovery_answer?.trim() || null
      });
      alert("Sign up successful. Please sign in.");
      router.push("/login");
    } catch (error) {
      alert(extractApiErrorMessage(error, "Sign up failed."));
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
      <section className="w-full rounded-lg border border-border bg-surface p-8">
        <h1 className="text-3xl font-semibold text-text">Create Account</h1>
        <p className="mt-2 text-sm text-muted">Create a new USER account and choose your bank.</p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">User name</span>
            <input
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("user_name")}
            />
            {errors.user_name ? <span className="text-xs text-danger">{errors.user_name.message}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Email</span>
            <input
              type="email"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("email")}
            />
            {errors.email ? <span className="text-xs text-danger">{errors.email.message}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Phone number (optional)</span>
            <input
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("phone_number")}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Bank</span>
            <select
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              value={watch("bank_id")}
              onChange={(event) => setValue("bank_id", Number(event.target.value))}
            >
              <option value={0}>Select bank</option>
              {(banksQuery.data || []).map((bank) => (
                <option key={bank.BankID} value={bank.BankID}>
                  {bank.BankCode} - {bank.BankName}
                </option>
              ))}
            </select>
            {errors.bank_id ? <span className="text-xs text-danger">{errors.bank_id.message}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Password</span>
            <input
              type="password"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("password")}
            />
            {errors.password ? <span className="text-xs text-danger">{errors.password.message}</span> : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Recovery hint (optional)</span>
            <input
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("recovery_hint")}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Recovery answer (optional)</span>
            <input
              type="password"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              {...register("recovery_answer")}
            />
          </label>

          <button
            type="submit"
            disabled={signupMutation.isPending || banksQuery.isLoading}
            className="focus-ring rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {signupMutation.isPending ? "Creating..." : "Create account"}
          </button>
        </form>

        <Link className="mt-4 inline-block text-sm text-muted underline" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}

