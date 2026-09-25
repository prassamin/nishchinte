export function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="group rounded-2xl border border-ap-border/70 bg-ap-surface/80 p-4 transition hover:-translate-y-0.5 hover:border-ap-accent/30 hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
      <p className="text-xs uppercase tracking-[0.14em] text-ap-muted">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-ap-foreground">{value}</p>
      <p className="mt-1 text-xs text-ap-muted">{sub}</p>
    </div>
  );
}
