export function LoadingBlock({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[var(--muted)]">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
