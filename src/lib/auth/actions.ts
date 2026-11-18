"use server";

import { isIP } from "node:net";
import { checkRateLimit } from "@vercel/firewall";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "./password";
import { createSession, destroySession, DASHBOARD_HOME } from "./session";

export type LoginState = {
  error?: string;
};

const LOGIN_UNAVAILABLE = "Inloggen is tijdelijk niet beschikbaar. Probeer het zo opnieuw.";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Gebruikersnaam of wachtwoord is onjuist." };
  }

  try {
    const { NODE_ENV, VERCEL, VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL } = process.env;
    const firewallHost =
      VERCEL_ENV === "production" ? VERCEL_PROJECT_PRODUCTION_URL :
      VERCEL_ENV === "preview" ? VERCEL_URL :
      undefined;
    const clientIp = (await headers()).get("x-vercel-forwarded-for");

    if (NODE_ENV !== "production" || VERCEL !== "1" || !firewallHost || !clientIp || !isIP(clientIp)) {
      throw new Error("Missing Vercel login rate-limit context");
    }

    // Supply only platform values. The SDK uses host for its outbound URL
    // and x-real-ip for the counter. It does not need browser headers or cookies.
    const result = await checkRateLimit("dba-login-v1", {
      headers: { host: firewallHost, "x-real-ip": clientIp },
      timeout: 1500,
    });
    if (result.error) {
      console.warn("[login] Rate-limit check unavailable", result.error);
      return { error: LOGIN_UNAVAILABLE };
    }
    if (result.rateLimited) {
      return { error: "Te veel inlogpogingen. Probeer het over enkele minuten opnieuw." };
    }
  } catch {
    console.warn("[login] Rate-limit check failed");
    return { error: LOGIN_UNAVAILABLE };
  }

  const valid = await verifyCredentials(username, password);
  if (!valid) {
    return { error: "Gebruikersnaam of wachtwoord is onjuist." };
  }

  await createSession(username);
  redirect(DASHBOARD_HOME);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
