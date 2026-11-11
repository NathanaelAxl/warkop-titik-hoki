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
    // HP: muncul sebagai lembar dari bawah; tablet/laptop: kotak di tengah
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-stone-950/50" onClick={dismissable ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[94dvh] w-full max-w-lg animate-[sheet-up_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl",
          className,
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 py-2 pl-4 pr-2 sm:px-5 sm:py-3">
            <h2 className="min-w-0 text-lg font-bold leading-snug">{title}</h2>
            {dismissable && (
              <button
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          // Di HP tombol footer dibuat sama lebar supaya mudah ditekan
          <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:flex-1 sm:px-5 sm:*:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
