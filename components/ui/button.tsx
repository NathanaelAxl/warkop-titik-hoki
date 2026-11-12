import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "bg-cream-200 text-espresso-900 hover:bg-cream-300 active:bg-cream-300",
  outline: "border border-cream-300 bg-white text-espresso-900 hover:bg-cream-50 active:bg-cream-100",
  ghost: "text-stone-700 hover:bg-cream-200/70 active:bg-cream-300",
  destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm min-w-9",
  default: "h-11 px-4 text-base min-w-11", // minimal 44px untuk layar sentuh
  lg: "h-14 px-6 text-lg min-w-14",
  icon: "h-11 w-11",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
