import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_TONES, Status } from "@/lib/data";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function StatusBadge({ status, testid }: { status: Status | string; testid?: string }) {
  const tone = (STATUS_TONES as Record<string, string>)[status] ??
    "bg-[hsl(var(--status-neutral)/0.14)] text-[hsl(var(--status-neutral))]";
  return (
    <span
      data-testid={testid}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function KPI({
  label,
  value,
  delta,
  hint,
  trend = "up",
  testid,
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
  testid?: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up"
      ? "text-[hsl(var(--status-success))]"
      : trend === "down"
        ? "text-[hsl(var(--status-error))]"
        : "text-[hsl(var(--status-neutral))]";
  return (
    <div
      data-testid={testid}
      className="rounded-lg border border-card-border bg-card p-4 flex flex-col gap-2"
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground" data-testid={testid ? `${testid}-value` : undefined}>
          {value}
        </div>
        {delta && (
          <div className={cn("flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums", trendColor)}>
            <TrendIcon size={13} />
            {delta}
          </div>
        )}
      </div>
      {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  testid,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "error" | "info";
  testid?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = {
    primary: "bg-primary",
    success: "bg-[hsl(var(--status-success))]",
    warning: "bg-[hsl(var(--status-warning))]",
    error: "bg-[hsl(var(--status-error))]",
    info: "bg-[hsl(var(--status-info))]",
  }[tone];
  return (
    <div data-testid={testid} className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", bg)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className,
  testid,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  testid?: string;
}) {
  return (
    <section
      data-testid={testid}
      className={cn("rounded-lg border border-card-border bg-card", className)}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-4 md:px-5 py-3.5 border-b border-card-border">
          <div>
            {title && (
              <h3 className="text-[13.5px] font-semibold tracking-tight text-foreground">{title}</h3>
            )}
            {subtitle && <p className="text-[11.5px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export function PillarBadge({ tone }: { tone: "green" | "amber" | "red" | "blue" }) {
  const map = {
    green: "bg-[hsl(var(--status-success)/0.14)] text-[hsl(var(--status-success))]",
    amber: "bg-[hsl(var(--status-warning)/0.16)] text-[hsl(var(--status-warning))]",
    red: "bg-[hsl(var(--status-error)/0.14)] text-[hsl(var(--status-error))]",
    blue: "bg-[hsl(var(--status-info)/0.14)] text-[hsl(var(--status-info))]",
  };
  return <span className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider", map[tone])} />;
}
