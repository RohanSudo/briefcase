import { auth0 } from "@/lib/auth0";
import { exchangeToken } from "@/lib/auth/token-exchange";

export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const statuses = await Promise.all([
    checkProvider("google"),
  ]);

  return Response.json({ connections: statuses });
}

async function checkProvider(provider: "google") {
  const result = await exchangeToken(provider);
  const status = result.ok ? "connected" : "disconnected";

  return {
    provider,
    status,
    error: result.ok ? null : result.error.message,
  };
}

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { provider } = await req.json();

  const connectionName = "google-oauth2";
  const reconnectUrl = `/auth/connect?connection=${connectionName}`;

  return Response.json({ reconnectUrl });
}
