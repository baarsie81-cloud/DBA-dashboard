"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "./password";
import { createSession, destroySession, DASHBOARD_HOME } from "./session";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Gebruikersnaam of wachtwoord is onjuist." };
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
