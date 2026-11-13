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
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Session expired" }, { status: 401, headers });
  }

  const expiresAt = await createSession(session.username);
  return Response.json({ expiresAt }, { headers });
}
