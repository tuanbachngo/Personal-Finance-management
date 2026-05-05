"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import {
  changeOwnPassword,
  extractApiErrorMessage,
  me,
  updateOwnProfile
} from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

type ProfileTab = "info" | "password";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setAuthUser, clearSession } = useAuth();

  const initialTab = useMemo<ProfileTab>(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    return tab === "password" ? "password" : "info";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [infoMessage, setInfoMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [infoError, setInfoError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [infoForm, setInfoForm] = useState({
    userName: "",
    email: "",
    phone: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setInfoForm({
      userName: user?.UserName || "",
      email: user?.Email || "",
      phone: user?.PhoneNumber || ""
    });
  }, [user?.Email, user?.PhoneNumber, user?.UserName]);

  const updateInfoMutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: async (result) => {
      setInfoError("");
      setInfoMessage(result.message);
      try {
        const refreshed = await me();
        setAuthUser(refreshed);
      } catch {
        // do not block success message if refresh fails
      }
    },
    onError: (error: unknown) => {
      setInfoMessage("");
      setInfoError(extractApiErrorMessage(error, "Failed to update profile."));
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeOwnPassword,
    onSuccess: async () => {
      await clearSession(false);
      router.replace("/login");
    },
    onError: (error: unknown) => {
      setPasswordMessage("");
      setPasswordError(extractApiErrorMessage(error, "Failed to change password."));
    }
  });

  const handleSaveInfo = async () => {
    setInfoError("");
    setInfoMessage("");
    await updateInfoMutation.mutateAsync({
      user_name: infoForm.userName,
      email: infoForm.email,
      phone_number: infoForm.phone || null
    });
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordMessage("");

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    await changePasswordMutation.mutateAsync({
      current_password: currentPassword,
      new_password: newPassword
    });
  };

  return (
    <AuthGuard>
      <AppShell
        title="Profile"
        subtitle="Manage personal info and password for your signed-in account."
      >
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === "info"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-bg text-text hover:bg-surface-hover"
              }`}
              onClick={() => setActiveTab("info")}
            >
              Personal Info
            </button>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === "password"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-bg text-text hover:bg-surface-hover"
              }`}
              onClick={() => setActiveTab("password")}
            >
              Change Password
            </button>
          </div>

          {activeTab === "info" ? (
            <div className="grid gap-3 md:max-w-xl">
              <label className="block">
                <span className="mb-1 block text-sm text-muted">User name</span>
                <input
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={infoForm.userName}
                  onChange={(event) =>
                    setInfoForm((prev) => ({ ...prev, userName: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-muted">Email</span>
                <input
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={infoForm.email}
                  onChange={(event) =>
                    setInfoForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-muted">Phone number</span>
                <input
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={infoForm.phone}
                  onChange={(event) =>
                    setInfoForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </label>

              {infoError ? (
                <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {infoError}
                </p>
              ) : null}
              {infoMessage ? (
                <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                  {infoMessage}
                </p>
              ) : null}

              <div>
                <button
                  type="button"
                  className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
                  disabled={updateInfoMutation.isPending}
                  onClick={handleSaveInfo}
                >
                  {updateInfoMutation.isPending ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "password" ? (
            <div className="grid gap-3 md:max-w-xl">
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Current password</span>
                <input
                  type="password"
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value
                    }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-muted">New password</span>
                <input
                  type="password"
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-muted">Confirm new password</span>
                <input
                  type="password"
                  className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value
                    }))
                  }
                />
              </label>

              {passwordError ? (
                <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {passwordError}
                </p>
              ) : null}
              {passwordMessage ? (
                <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                  {passwordMessage}
                </p>
              ) : null}

              <div>
                <button
                  type="button"
                  className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
                  disabled={changePasswordMutation.isPending}
                  onClick={handleChangePassword}
                >
                  {changePasswordMutation.isPending ? "Updating..." : "Change password"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </AppShell>
    </AuthGuard>
  );
}

