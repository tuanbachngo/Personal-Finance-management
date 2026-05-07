"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import type { DashboardReminder } from "@/types/api";

type ReminderBannerProps = {
  reminder: DashboardReminder;
  onDismiss?: (id: string) => void;
  showDismiss?: boolean;
  compact?: boolean;
};

function severityClass(severity: string): string {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "danger") {
    return "border-danger/40 bg-surface text-text shadow-lg";
  }
  if (normalized === "warning") {
    return "border-warning/40 bg-surface text-text shadow-lg";
  }
  return "border-border bg-surface text-text shadow-lg";
}

export function ReminderBanner({
  reminder,
  onDismiss,
  showDismiss = true,
  compact = false,
}: ReminderBannerProps) {
  return (
    <article
      className={`rounded-xl border ${compact ? "p-3" : "p-4"} ${severityClass(reminder.severity)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`${compact ? "text-xs" : "text-sm"} font-bold text-text`}>{reminder.title}</h3>
          <p className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-muted`}>{reminder.message}</p>
        </div>
        {showDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss?.(reminder.id)}
            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:bg-surface-hover hover:text-text"
            aria-label="Ẩn thông báo"
            title="Ẩn thông báo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <Link
          href={reminder.action_href}
          className={`focus-ring inline-flex rounded-lg bg-primary ${
            compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } font-bold text-bg transition hover:bg-primary/90`}
        >
          {reminder.action_label}
        </Link>
      </div>
    </article>
  );
}
