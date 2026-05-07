"use client";

import { Pencil, Trash2 } from "lucide-react";

import { getCategoryIcon } from "@/lib/category-icon";
import { formatCurrency } from "@/lib/format";

type AlertLevel = "NORMAL" | "WARNING" | "EXCEEDED" | string;
type PaceStatus = "ON_TRACK" | "WATCH" | "OVER_PACE" | "EXCEEDED" | string;
type Priority = "LOW" | "MEDIUM" | "HIGH" | string;

export type BudgetItemCardProps = {
  // Identity
  icon: string;
  iconName: string;
  title: string;
  subtitle?: string;

  // Amounts
  plannedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;

  // Status
  alertLevel: AlertLevel;
  paceStatus: PaceStatus;
  isSoftLocked?: boolean;

  // Footer metrics
  safePerDay: number;
  safePerWeek: number;
  priority?: Priority;

  // Actions
  onEdit?: () => void;
  onDelete?: () => void;
};

function paceBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "ON_TRACK") return "border-success/40 bg-success/10 text-success";
  if (s === "WATCH") return "border-warning/40 bg-warning/10 text-warning";
  return "border-danger/40 bg-danger/10 text-danger";
}

function paceLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "ON_TRACK") return "ĐÚNG TIẾN ĐỘ";
  if (s === "WATCH") return "THEO DÕI";
  if (s === "OVER_PACE") return "VƯỢT NHỊP";
  if (s === "EXCEEDED") return "VƯỢT MỨC";
  return s;
}

function priorityLabel(p?: string): string {
  if (!p) return "TRUNG BÌNH";
  const s = p.toUpperCase();
  if (s === "HIGH") return "CAO";
  if (s === "LOW") return "THẤP";
  return "TRUNG BÌNH";
}

export function BudgetItemCard({
  icon,
  iconName,
  title,
  subtitle,
  plannedAmount,
  spentAmount,
  remainingAmount,
  usagePercent,
  alertLevel,
  paceStatus,
  isSoftLocked = false,
  safePerDay,
  safePerWeek,
  priority,
  onEdit,
  onDelete,
}: BudgetItemCardProps) {
  const tone =
    alertLevel.toUpperCase() === "EXCEEDED"
      ? "danger"
      : alertLevel.toUpperCase() === "WARNING"
        ? "warning"
        : "default";

  // Progress bar color
  const progressColor =
    tone === "danger"
      ? "bg-danger"
      : tone === "warning"
        ? "bg-warning"
        : "bg-primary";

  const pct = Math.max(0, Math.min(usagePercent, 100));

  return (
    <article className="rounded-xl border border-border bg-bg p-4">
      {/* Header row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-text">
            {getCategoryIcon(icon, iconName)} {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-muted">{subtitle}</p>
          ) : null}
          <p className="mt-0.5 text-sm text-muted">
            Dự kiến {formatCurrency(plannedAmount)}
            {" | "}
            Đã chi {formatCurrency(spentAmount)}
            {" | "}
            Còn lại {formatCurrency(remainingAmount)}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${paceBadgeClass(paceStatus)}`}
          >
            {paceLabel(paceStatus)}
          </span>

          {tone === "danger" ? (
            <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-bold uppercase text-danger">
              VƯỢT MỨC
            </span>
          ) : tone === "warning" ? (
            <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-bold uppercase text-warning">
              CẢNH BÁO
            </span>
          ) : (
            <span className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-bold uppercase text-muted">
              ỔN ĐỊNH
            </span>
          )}

          {isSoftLocked ? (
            <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-bold uppercase text-danger">
              KHÓA MỀM
            </span>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full rounded-full bg-border">
        <div
          className={`h-2 rounded-full transition-all ${progressColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Footer metrics */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>An toàn/ngày: {formatCurrency(safePerDay)}</span>
        <span>An toàn/tuần: {formatCurrency(safePerWeek)}</span>
        {priority !== undefined ? (
          <span>Ưu tiên: {priorityLabel(priority)}</span>
        ) : null}
      </div>

      {/* Action buttons */}
      {(onEdit !== undefined || onDelete !== undefined) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit !== undefined ? (
            <button
              type="button"
              onClick={onEdit}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text transition hover:bg-surface-hover"
            >
              <Pencil size={12} />
              Sửa
            </button>
          ) : null}
          {onDelete !== undefined ? (
            <button
              type="button"
              onClick={onDelete}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger/20"
            >
              <Trash2 size={12} />
              Xóa
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
