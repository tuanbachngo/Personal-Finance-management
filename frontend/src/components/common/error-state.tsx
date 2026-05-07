type ErrorStateProps = {
  title?: string;
  detail: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Đã xảy ra lỗi",
  detail,
  onRetry
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-danger/50 bg-bg p-4">
      <h3 className="text-lg font-semibold text-danger">{title}</h3>
      <p className="mt-2 text-sm text-muted">{detail}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-4 rounded-md border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

