type KpiCardProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "warning";
  format?: "currency" | "number";
};

const toneClassMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-text",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning"
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

export function KpiCard({ label, value, tone = "default", format = "currency" }: KpiCardProps) {
  const displayValue = format === "number" ? formatNumber(value) : formatCurrency(value);
  return (
    <article
      className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
      aria-label={label}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-bold tracking-tight ${toneClassMap[tone]}`}>{displayValue}</p>
    </article>
  );
}
