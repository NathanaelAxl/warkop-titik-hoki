"use client";
import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

type U = { id: number; name: string; role: "owner" | "pegawai" };

export default function LoginPage() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [selected, setSelected] = useState<U | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ users: U[] }>("/api/auth/users")
      .then((r) => {
        setUsers(r.users);
        if (r.users.length === 1) setSelected(r.users[0]);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  async function submit(p = pin) {
    if (!selected || p.length < 4) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { body: { userId: selected.id, pin: p } });
      window.location.href = "/";
    } catch (e) {
      setError(errMsg(e));
      setPin("");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    setError("");
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 6) submit(next);
  }

  // Dukungan keyboard fisik
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="bg-espresso-gradient relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="animate-fade-up relative grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="border-b border-cream-200 bg-cream-50 p-6 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-14 w-14 drop-shadow-md" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-espresso-900">Warkop Titik Hoki</h1>
              <p className="text-sm text-stone-500">Pilih nama Anda</p>
            </div>
          </div>
          {!users ? (
            <div className="flex justify-center py-10">{error ? <p className="text-red-600">{error}</p> : <Spinner />}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelected(u);
                    setPin("");
                    setError("");
                  }}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 transition",
                    selected?.id === u.id ? "border-brand-500 bg-white" : "border-cream-200 bg-white hover:border-cream-300",
                  )}
                >
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold text-white", u.role === "owner" ? "bg-espresso-800" : "bg-brand-600")}>{u.name.slice(0, 1).toUpperCase()}</span>
                  <span className="font-semibold">{u.name}</span>
                  <span className="text-xs uppercase text-stone-500">{u.role}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col items-center p-6">
          <p className="mb-3 text-stone-600">{selected ? `PIN untuk ${selected.name}` : "Pilih nama dulu"}</p>
          <div className="mb-2 flex h-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full border-2",
                  i < pin.length ? "border-brand-600 bg-brand-600" : "border-stone-300",
                  i >= 4 && i >= pin.length && "opacity-40",
                )}
              />
            ))}
          </div>
          <p className="mb-3 h-5 text-sm font-medium text-red-600">{error}</p>
          <div className="grid w-full max-w-xs grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <PinKey key={d} disabled={!selected || busy} onClick={() => press(d)}>
                {d}
              </PinKey>
            ))}
            <PinKey disabled={!selected || busy} onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Hapus">
              <Delete className="h-6 w-6" />
            </PinKey>
            <PinKey disabled={!selected || busy} onClick={() => press("0")}>
              0
            </PinKey>
            <Button
              size="lg"
              className="h-16 rounded-2xl"
              disabled={!selected || pin.length < 4}
              loading={busy}
              onClick={() => submit()}
            >
              Masuk
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function PinKey(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-16 items-center justify-center rounded-2xl bg-cream-100 text-2xl font-bold text-espresso-900 transition hover:bg-cream-200 active:bg-cream-300 disabled:opacity-40"
    />
  );
}
