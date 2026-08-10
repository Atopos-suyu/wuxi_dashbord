export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-6 py-12 text-center animate-fade-up">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        {title}
      </p>
      {description ? (
        <p className="max-w-xs text-sm text-[var(--muted)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
