"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  dismissable?: boolean;
}) {
  React.useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissable]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/50" onClick={dismissable ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          className,
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
            <h2 className="text-lg font-bold">{title}</h2>
            {dismissable && (
              <button
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
