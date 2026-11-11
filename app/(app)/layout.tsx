import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { AppProvider } from "@/components/app-context";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sess = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sess) redirect("/login");
  return (
    <AppProvider initialUser={{ id: sess.uid, name: sess.name, role: sess.role }}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
