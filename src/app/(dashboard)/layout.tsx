import { Sidebar } from "@/components/dashboard/Sidebar";
import { SessionActivity } from "@/components/auth/SessionActivity";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-dba-background">
      <SessionActivity initialExpiresAt={session.exp * 1000} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-auto px-6 py-7 xl:px-8">
          <div className="w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
