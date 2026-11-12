import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-cream-200 bg-white shadow-[0_1px_2px_rgb(74_46_31/0.05)]", className)}
      {...props}
    />
  );
}

const badgeColors = {
  default: "bg-cream-100 text-stone-700 ring-cream-300",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
} as const;

export function Badge({
  color = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof badgeColors }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", badgeColors[color], className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent", className)} />;
}

export function EmptyState({
  title,
  icon: Icon = Inbox,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-stone-500">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 text-stone-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-espresso-800">{title}</p>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-espresso-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
