import { redirect } from "next/navigation";
import { Logo } from "@/components/dashboard/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { DASHBOARD_HOME, getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(DASHBOARD_HOME);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dba-background px-4 py-10">
      <div className="w-full max-w-[400px] rounded-xl border border-dba-border bg-dba-surface px-8 py-8 shadow-[0_1px_2px_rgba(51,53,54,0.04)]">
        <div className="flex flex-col items-center text-center">
          <Logo variant="dark" linked={false} className="flex justify-center" />
          <h1 className="mt-6 text-[1.5rem] font-semibold tracking-tight text-dba-charcoal">
            Inloggen
          </h1>
          <p className="mt-1 text-sm text-dba-muted">DBA Hypotheekdashboard</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
