import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-stone-700", className)} {...props} />;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base placeholder:text-stone-400",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2 disabled:opacity-50"
    >
      <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-stone-300")}>
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
