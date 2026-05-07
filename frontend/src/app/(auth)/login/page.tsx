"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Banknote,
  CircleDollarSign,
  Coins,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  Wallet,
  WalletCards
} from "lucide-react";

import { extractApiErrorMessage, login } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập email hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

type FloatingMoneyIcon = {
  Icon: LucideIcon;
  positionClass: string;
  colorClass: string;
  sizeClass: string;
  delay: string;
  duration: string;
};

const floatingMoneyIcons: FloatingMoneyIcon[] = [
  {
    Icon: CircleDollarSign,
    positionClass: "left-[12%] top-[18%]",
    colorClass: "text-primary/70",
    sizeClass: "h-8 w-8",
    delay: "-1s",
    duration: "14s"
  },
  {
    Icon: PiggyBank,
    positionClass: "left-[14%] top-[35%]",
    colorClass: "text-success/70",
    sizeClass: "h-8 w-8",
    delay: "-6s",
    duration: "16s"
  },
  {
    Icon: WalletCards,
    positionClass: "left-[10%] bottom-[22%]",
    colorClass: "text-warning/70",
    sizeClass: "h-8 w-8",
    delay: "-4s",
    duration: "15s"
  },
  {
    Icon: Coins,
    positionClass: "left-[28%] top-[11%]",
    colorClass: "text-primary/65",
    sizeClass: "h-7 w-7",
    delay: "-8s",
    duration: "17s"
  },
  {
    Icon: Banknote,
    positionClass: "left-[25%] bottom-[11%]",
    colorClass: "text-success/68",
    sizeClass: "h-7 w-7",
    delay: "-2s",
    duration: "13s"
  },
  {
    Icon: Landmark,
    positionClass: "left-[38%] top-[21%]",
    colorClass: "text-warning/65",
    sizeClass: "h-7 w-7",
    delay: "-5s",
    duration: "15s"
  },
  {
    Icon: ReceiptText,
    positionClass: "right-[12%] top-[19%]",
    colorClass: "text-primary/70",
    sizeClass: "h-8 w-8",
    delay: "-3s",
    duration: "14s"
  },
  {
    Icon: CreditCard,
    positionClass: "right-[13%] top-[36%]",
    colorClass: "text-success/70",
    sizeClass: "h-8 w-8",
    delay: "-7s",
    duration: "16s"
  },
  {
    Icon: Wallet,
    positionClass: "right-[11%] bottom-[23%]",
    colorClass: "text-warning/70",
    sizeClass: "h-8 w-8",
    delay: "-4s",
    duration: "17s"
  },
  {
    Icon: HandCoins,
    positionClass: "right-[27%] top-[10%]",
    colorClass: "text-primary/68",
    sizeClass: "h-7 w-7",
    delay: "-2s",
    duration: "13s"
  },
  {
    Icon: BadgeDollarSign,
    positionClass: "right-[24%] bottom-[10%]",
    colorClass: "text-success/68",
    sizeClass: "h-7 w-7",
    delay: "-9s",
    duration: "18s"
  },
  {
    Icon: TrendingUp,
    positionClass: "right-[37%] top-[24%]",
    colorClass: "text-warning/68",
    sizeClass: "h-7 w-7",
    delay: "-5s",
    duration: "15s"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { ready, isAuthenticated, setSession } = useAuth();
  const [formError, setFormError] = useState("");
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (ready && isAuthenticated && !redirectAfterLogin) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, redirectAfterLogin, router]);

  const mutation = useMutation({
    mutationFn: login
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      const result = await mutation.mutateAsync(values);
      setRedirectAfterLogin(true);
      setSession(result);
      router.replace("/dashboard?welcome=1");
    } catch (error: unknown) {
      const message = extractApiErrorMessage(error, "Đăng nhập thất bại.");
      setFormError(message);
    }
  });

  return (
    <main className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-bg-orb left-[-70px] top-[-20px] h-52 w-52 bg-primary/60" />
        <div className="login-bg-orb login-bg-orb-second right-[-100px] top-[20%] h-72 w-72 bg-success/40" />
        <div className="login-bg-orb login-bg-orb-third bottom-[-120px] left-[20%] h-80 w-80 bg-warning/35" />
        <div className="login-bg-stream left-[8%] top-[15%]" />
        <div className="login-bg-stream login-bg-stream-second right-[8%] bottom-[21%]" />

        {floatingMoneyIcons.map((item, index) => {
          const IconComponent = item.Icon;
          return (
            <div
              key={`${item.positionClass}-${index}`}
              className={`login-bg-money-icon hidden md:flex ${item.positionClass}`}
              style={{
                animationDelay: item.delay,
                animationDuration: item.duration
              }}
            >
              <IconComponent className={`${item.sizeClass} ${item.colorClass}`} strokeWidth={2.2} />
            </div>
          );
        })}

        <div className="login-bg-particle left-[10%] top-[22%]" />
        <div className="login-bg-particle login-bg-particle-second left-[18%] bottom-[20%]" />
        <div className="login-bg-particle login-bg-particle-third right-[14%] top-[26%]" />
        <div className="login-bg-particle right-[8%] bottom-[18%]" />
        <div className="login-bg-particle login-bg-particle-second left-[44%] top-[10%]" />
        <div className="login-bg-particle login-bg-particle-third right-[40%] bottom-[9%]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-5xl font-black leading-none tracking-tight">
            <span className="text-text">Va</span>
            <span className="text-primary">ult</span>
          </h1>
        </div>

        <section className="w-full rounded-lg border border-border bg-surface/95 p-8 shadow-lg backdrop-blur">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold text-text">Đăng nhập</h2>
            <p className="mt-2 text-sm text-muted">
              Truy cập bảng điều khiển tài chính và tiếp tục phiên làm việc của bạn.
            </p>
          </div>

          {!ready ? <p className="mb-3 text-sm text-muted">Đang kiểm tra phiên đăng nhập...</p> : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Email</span>
              <input
                type="email"
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                placeholder="ban@example.com"
                {...register("email")}
              />
              {errors.email ? (
                <span className="mt-1 block text-xs text-danger">{errors.email.message}</span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-muted">Mật khẩu</span>
              <input
                type="password"
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                placeholder="Nhập mật khẩu"
                {...register("password")}
              />
              {errors.password ? (
                <span className="mt-1 block text-xs text-danger">{errors.password.message}</span>
              ) : null}
            </label>

            {formError ? (
              <div className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!ready || mutation.isPending}
              className="focus-ring w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-bg disabled:opacity-60"
            >
              {mutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              className="focus-ring rounded-md border border-border px-3 py-2 text-center text-sm text-text hover:bg-surface-hover"
              href="/signup"
            >
              Đăng ký
            </Link>
            <Link
              className="focus-ring rounded-md border border-border px-3 py-2 text-center text-sm text-text hover:bg-surface-hover"
              href="/forgot-password"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className="mt-2">
            <Link className="text-xs text-muted underline" href="/verify-otp-unlock">
              Tài khoản bị khóa? Xác minh OTP mở khóa
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

