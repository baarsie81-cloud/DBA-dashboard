import { Sidebar } from "@/components/dashboard/Sidebar";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSession();

  return (
    <div className="flex min-h-screen bg-dba-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-auto px-6 py-7 xl:px-8">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
