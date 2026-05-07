"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { DashboardReminder } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Bảng điều khiển", href: "/dashboard", icon: LayoutDashboard },
  { label: "Giao dịch", href: "/transactions", icon: CircleDollarSign },
  { label: "Ngân sách", href: "/budgets", icon: Wallet },
  { label: "Mục tiêu", href: "/goals", icon: Target },
  { label: "Báo cáo", href: "/reports", icon: BarChart3 },
  { label: "Quản lý người dùng", href: "/user-management", icon: Users, adminOnly: true },
];

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  reminders?: DashboardReminder[];
  hiddenReminders?: DashboardReminder[];
};

function getInitial(name?: string | null, email?: string | null): string {
  const source = (name || email || "U").trim();
  return source.charAt(0).toUpperCase();
}

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  reminders = [],
  hiddenReminders = [],
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, clearSession } = useAuth();
  const {
    users,
    selectedUserId,
    setSelectedUserId,
    loadingUsers,
    scopeMode,
    setScopeMode,
    effectiveIsAdmin,
  } = useUserScope();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || effectiveIsAdmin);
  const avatarInitial = useMemo(
    () => getInitial(user?.UserName, user?.Email),
    [user?.Email, user?.UserName],
  );
  const role = String(user?.UserRole || "USER").toUpperCase();
  const roleLabel = role === "ADMIN" ? "QUẢN TRỊ" : "NGƯỜI DÙNG";
  const scopeModeLabel = scopeMode === "ADMIN" ? "QUẢN TRỊ" : "NGƯỜI DÙNG";
  const selectedUser = users.find((row) => row.UserID === selectedUserId);
  const reminderBadgeCount = reminders.length;

  useEffect(() => {
    setNotificationMenuOpen(false);
  }, [pathname]);

  const profileMenuClass = collapsed
    ? "absolute bottom-0 left-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-border bg-surface p-3 shadow-2xl"
    : "absolute bottom-[calc(100%+10px)] left-0 z-50 w-full rounded-2xl border border-border bg-surface p-3 shadow-2xl";

  const notificationPanelClass = collapsed
    ? "absolute left-[calc(100%+10px)] top-0 z-50 w-[min(280px,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface p-3 shadow-2xl"
    : "absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface p-3 shadow-2xl";

  const notificationPanel = notificationMenuOpen ? (
    <div className={notificationPanelClass}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        Thông báo đã ẩn
      </p>
      {hiddenReminders.length === 0 ? (
        <p className="rounded-xl border border-border bg-bg px-3 py-2 text-xs text-muted">
          Chưa có thông báo nào được ẩn trong phiên này.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {hiddenReminders.map((reminder) => (
            <article
              key={reminder.id}
              className="rounded-xl border border-border bg-bg p-3"
            >
              <p className="text-xs font-bold text-text">{reminder.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{reminder.message}</p>
              <Link
                href={reminder.action_href}
                className="focus-ring mt-2 inline-flex rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-bg transition hover:bg-primary/90"
                onClick={() => setNotificationMenuOpen(false)}
              >
                {reminder.action_label}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const notificationButton = (
    <button
      type="button"
      onClick={() => setNotificationMenuOpen((current) => !current)}
      className="focus-ring relative rounded-lg border border-border bg-bg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
      aria-label="Mở thông báo"
      title="Mở thông báo"
    >
      <Bell className="h-4 w-4" />
      {reminderBadgeCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-bg">
          {reminderBadgeCount > 99 ? "99+" : reminderBadgeCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <aside
      className={`hidden h-screen shrink-0 flex-col border-r border-border bg-surface text-text lg:flex ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className={collapsed ? "shrink-0 px-2 pb-4 pt-4" : "shrink-0 px-7 pb-6 pt-8"}>
        {collapsed ? (
          <div className="relative flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="focus-ring rounded-lg border border-border bg-bg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
              aria-label="Mở rộng thanh bên"
              title="Mở rộng thanh bên"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            {notificationButton}
            {notificationPanel}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-black leading-none tracking-tight">
                <span className="text-text">Va</span>
                <span className="text-primary">ult</span>
              </h1>

              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  className="focus-ring rounded-lg border border-border bg-bg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  aria-label="Thu gọn thanh bên"
                  title="Thu gọn thanh bên"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                {notificationButton}
                {notificationPanel}
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-muted">Tài chính cá nhân của bạn.</p>
          </>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2 pb-4" : "px-5 pb-5"}`}>
        {!collapsed && isAdmin && effectiveIsAdmin ? (
          <div className="mb-5 rounded-2xl border border-border bg-bg p-3">
            <label className="mb-2 block text-xs font-semibold text-muted">
              Phạm vi người dùng hiện tại
            </label>
            <select
              className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text"
              value={selectedUserId ?? ""}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              disabled={loadingUsers || users.length === 0}
            >
              {users.map((row) => (
                <option key={row.UserID} value={row.UserID}>
                  {row.UserName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={`focus-ring flex items-center rounded-xl transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text hover:bg-surface-hover"
                } ${
                  collapsed
                    ? "justify-center px-2 py-3"
                    : "px-4 py-3 text-sm font-bold"
                }`}
              >
                <ItemIcon
                  className={`${collapsed ? "" : "mr-3"} h-4 w-4 shrink-0`}
                  strokeWidth={2.25}
                />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`sticky bottom-0 z-20 shrink-0 border-t border-border bg-surface/95 backdrop-blur ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}>
        <div className="relative">
          <button
            type="button"
            className={`focus-ring flex w-full items-center rounded-2xl border border-border bg-bg shadow-sm transition-colors hover:bg-surface-hover ${
              collapsed ? "justify-center p-2.5" : "gap-3 p-3 text-left"
            }`}
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            title={collapsed ? "Menu tài khoản" : undefined}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm font-black text-primary">
              {avatarInitial}
            </div>

            {collapsed ? null : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-text">
                    {user?.UserName || "Tài khoản"}
                  </p>
                  <p className="truncate text-xs font-semibold text-muted">
                    {isAdmin ? `CHẾ ĐỘ ${scopeModeLabel}` : roleLabel}
                  </p>
                </div>

                <span className="text-sm text-muted">{profileMenuOpen ? "^" : "v"}</span>
              </>
            )}
          </button>

          {profileMenuOpen ? (
            <div className={profileMenuClass} role="menu">
              <div className="border-b border-border pb-3">
                <p className="truncate text-sm font-black text-text">
                  {user?.UserName || "-"}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {user?.Email || "-"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase transition-colors ${
                      !isAdmin || scopeMode === "USER"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-bg text-muted hover:bg-surface-hover"
                    }`}
                    onClick={() => {
                      if (isAdmin) {
                        setScopeMode("USER");
                        setProfileMenuOpen(false);
                        router.replace("/dashboard");
                      }
                    }}
                  >
                    Người dùng
                  </button>

                  {isAdmin ? (
                    <button
                      type="button"
                      className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase transition-colors ${
                        scopeMode === "ADMIN"
                          ? "border-danger/30 bg-danger/10 text-danger"
                          : "border-border bg-bg text-muted hover:bg-surface-hover"
                      }`}
                      onClick={() => {
                        setScopeMode("ADMIN");
                        setProfileMenuOpen(false);
                      }}
                    >
                      Quản trị
                    </button>
                  ) : null}
                </div>

                {isAdmin && effectiveIsAdmin ? (
                  <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-xs text-muted">
                    Đang xem dữ liệu theo{" "}
                    <span className="font-bold text-text">
                      {selectedUser?.UserName || "người dùng đã chọn"}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="py-2">
                <button
                  type="button"
                  className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push("/profile");
                  }}
                >
                  Thông tin cá nhân
                </button>
                <button
                  type="button"
                  className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push("/profile?tab=password");
                  }}
                >
                  Đổi mật khẩu
                </button>
              </div>

              <button
                type="button"
                className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-danger transition-colors hover:bg-danger/10"
                onClick={async () => {
                  setProfileMenuOpen(false);
                  await clearSession(true);
                  router.replace("/login");
                }}
              >
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
