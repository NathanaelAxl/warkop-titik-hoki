import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-stone-200 bg-white shadow-sm", className)} {...props} />;
}

const badgeColors = {
  default: "bg-stone-100 text-stone-700",
  brand: "bg-brand-100 text-brand-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
} as const;

export function Badge({
  color = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof badgeColors }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeColors[color], className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent", className)} />;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-stone-500">
      <p className="text-lg font-semibold text-stone-600">{title}</p>
      {children}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
