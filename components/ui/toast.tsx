"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
type Ctx = { toast: (message: string, kind?: Toast["kind"]) => void };

const ToastCtx = React.createContext<Ctx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const toast = React.useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, message, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg",
              t.kind === "success" && "bg-emerald-600",
              t.kind === "error" && "bg-red-600",
              t.kind === "info" && "bg-stone-800",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => React.useContext(ToastCtx).toast;
