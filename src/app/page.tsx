import { redirect } from "next/navigation";
import { DASHBOARD_HOME, getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? DASHBOARD_HOME : "/login");
}
