"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Role, StoreInfo } from "@/lib/types";

export type AppUser = { id: number; name: string; role: Role };
type Ctx = {
  user: AppUser;
  store: StoreInfo;
  businessDate: string;
  reload: () => Promise<void>;
};

const DEFAULT_STORE: StoreInfo = {
  store_name: "WARKOP TITIK HOKI",
  store_address: "",
  store_hours: "",
  receipt_footer: "",
  day_cutoff: "06:00",
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ initialUser, children }: { initialUser: AppUser; children: React.ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [store, setStore] = useState<StoreInfo>(DEFAULT_STORE);
  const [businessDate, setBusinessDate] = useState("");

  const reload = useCallback(async () => {
    const r = await api<{ user: AppUser; store: StoreInfo; businessDate: string }>("/api/me");
    setUser(r.user);
    setStore(r.store);
    setBusinessDate(r.businessDate);
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return <AppCtx.Provider value={{ user, store, businessDate, reload }}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp di luar AppProvider");
  return c;
}
