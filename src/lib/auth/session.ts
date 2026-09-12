import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DASHBOARD_HOME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "./config";

type SessionPayload = {
  username: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  return secret;
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function createToken(username: string): string {
  const secret = getSessionSecret();
  const payload: SessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded, secret)}`;
}

function parseToken(token: string): SessionPayload | null {
  try {
    const secret = getSessionSecret();
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expected = sign(encoded, secret);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, createToken(username), cookieOptions());
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return parseToken(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export { DASHBOARD_HOME };
