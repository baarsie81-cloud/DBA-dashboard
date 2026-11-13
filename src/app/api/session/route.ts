import { createSession, getSession } from "@/lib/auth/session";

const headers = { "Cache-Control": "no-store" };

// Inspect the shared cookie without extending an idle session (also across tabs).
export async function GET() {
  const session = await getSession();
  return session
    ? Response.json({ expiresAt: session.exp * 1000 }, { headers })
    : Response.json({ error: "Session expired" }, { status: 401, headers });
}

export async function POST(request: Request) {
  // SameSite is additional protection; renewal requires an explicit same origin.
  // Next.js can use an internal hostname in request.url. Compare the browser's
  // Origin to the actual Host, with the protocol supplied by the deployment.
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  if (
    !host ||
    (protocol !== "https" && protocol !== "http") ||
    request.headers.get("origin") !== `${protocol}://${host}`
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Session expired" }, { status: 401, headers });
  }

  const expiresAt = await createSession(session.username);
  return Response.json({ expiresAt }, { headers });
}
