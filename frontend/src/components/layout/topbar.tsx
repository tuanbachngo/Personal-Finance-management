type TopbarProps = {
  title: string;
  subtitle?: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-2xl font-semibold text-text">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}

