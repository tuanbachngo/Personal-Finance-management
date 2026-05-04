type StatusBadgeProps = {
  text: string;
  tone: "normal" | "warning" | "exceeded";
};

const toneMap: Record<StatusBadgeProps["tone"], string> = {
  normal: "border-success/50 text-success",
  warning: "border-warning/50 text-warning",
  exceeded: "border-danger/50 text-danger"
};

export function StatusBadge({ text, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${toneMap[tone]}`}>
      {text}
    </span>
  );
}

