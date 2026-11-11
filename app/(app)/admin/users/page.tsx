"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { api, errMsg } from "@/lib/client";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Card, PageHeader, Spinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

type U = { id: number; name: string; role: "owner" | "pegawai"; isActive: boolean };

export default function UsersPage() {
  const { user: me } = useApp();
  const toast = useToast();
  const [users, setUsers] = useState<U[] | null>(null);
  const [edit, setEdit] = useState<U | "new" | null>(null);
  const [resetFor, setResetFor] = useState<U | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers((await api<{ users: U[] }>("/api/admin/users")).users);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(u: U, v: boolean) {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { isActive: v } });
      load();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-3 md:p-4">
      <PageHeader title="Kelola Pegawai">
        <Button onClick={() => setEdit("new")}>
          <Plus className="h-5 w-5" /> Tambah Akun
        </Button>
      </PageHeader>
      <Card className="p-3">
        {!users ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2 py-2">
                <div className="flex-1">
                  <span className={u.isActive ? "font-semibold" : "font-semibold text-stone-400"}>{u.name}</span>{" "}
                  <Badge color={u.role === "owner" ? "brand" : "default"}>{u.role}</Badge>
                  {u.id === me.id && <span className="ml-2 text-xs text-stone-500">(Anda)</span>}
                </div>
                <Switch checked={u.isActive} disabled={u.id === me.id} onChange={(v) => toggle(u, v)} label={u.isActive ? "Aktif" : "Nonaktif"} />
                <Button variant="ghost" size="icon" onClick={() => setResetFor(u)} aria-label="Reset PIN" title="Reset PIN">
                  <KeyRound className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEdit(u)} aria-label="Ubah" title="Ubah">
                  <Pencil className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit && <UserDialog user={edit === "new" ? null : edit} isSelf={edit !== "new" && edit.id === me.id} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {resetFor && <ResetPinDialog user={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
}

function UserDialog({ user, isSelf, onClose, onSaved }: { user: U | null; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<U["role"]>(user?.role ?? "pegawai");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && (user || /^\d{4,6}$/.test(pin));

  async function save() {
    setBusy(true);
    try {
      if (user) await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { name: name.trim(), role } });
      else await api("/api/admin/users", { body: { name: name.trim(), role, pin } });
      toast("Akun disimpan", "success");
      onSaved();
    } catch (e) {
      toast(errMsg(e), "error");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={user ? "Ubah Akun" : "Akun Baru"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button loading={busy} disabled={!valid} onClick={save}>
            Simpan
          </Button>
        </>
      }
    >
      <Label>Nama</Label>
      <Input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      <Label className="mt-3">Peran</Label>
      <Select value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as U["role"])}>
        <option value="pegawai">Pegawai</option>
        <option value="owner">Owner</option>
      </Select>
      {!user && (
        <>
          <Label className="mt-3">PIN (4–6 digit)</Label>
          <Input inputMode="numeric" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        </>
      )}
    </Dialog>
  );
}

function ResetPinDialog({ user, onClose }: { user: U; onClose: () => void }) {
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}/reset-pin`, { body: { pin } });
      toast(`PIN ${user.name} diganti`, "success");
      onClose();
    } catch (e) {
      toast(errMsg(e), "error");
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Reset PIN: ${user.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button loading={busy} disabled={!/^\d{4,6}$/.test(pin)} onClick={save}>
            Simpan PIN
          </Button>
        </>
      }
    >
      <Label>PIN baru (4–6 digit)</Label>
      <Input autoFocus inputMode="numeric" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
    </Dialog>
  );
}
