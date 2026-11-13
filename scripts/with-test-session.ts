/** Synthetic Next.js request context for standalone, database-free checks. */
import "next/dist/server/node-environment";
import { createHmac, randomBytes } from "node:crypto";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../src/lib/auth/config";

export async function withTestSession<T>(run: () => Promise<T>): Promise<T> {
  const previousUsername = process.env.AUTH_USERNAME;
  const previousSecret = process.env.SESSION_SECRET;
  const username = "synthetic-verification-user";
  const secret = randomBytes(32).toString("hex");
  process.env.AUTH_USERNAME = username;
  process.env.SESSION_SECRET = secret;
  const encoded = Buffer.from(JSON.stringify({
    version: 2,
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  })).toString("base64url");
  const token = `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
  const cookies = new RequestCookies(new Headers({ cookie: `${SESSION_COOKIE_NAME}=${token}` }));
  // These are test-only contexts; the actual session verifier remains in use.
  const work = { route: "/__verification", isStaticGeneration: false } as Parameters<typeof workAsyncStorage.run>[0];
  const request = { type: "request", phase: "render", cookies } as unknown as Parameters<typeof workUnitAsyncStorage.run>[0];
  try {
    return await workAsyncStorage.run(work, () => workUnitAsyncStorage.run(request, run));
  } finally {
    if (previousUsername === undefined) delete process.env.AUTH_USERNAME;
    else process.env.AUTH_USERNAME = previousUsername;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
}
