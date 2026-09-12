"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-[13px] font-medium text-dba-charcoal"
        >
          Gebruikersnaam
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="h-10 rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[13px] font-medium text-dba-charcoal"
        >
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 rounded-lg border border-dba-border bg-dba-background px-3 text-sm text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-dba-dark-green px-4 text-sm font-medium text-white transition-colors hover:bg-dba-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-dark-green focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
