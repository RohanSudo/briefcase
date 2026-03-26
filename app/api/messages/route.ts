import { auth0 } from "@/lib/auth0";
import { getMessages, saveMessage } from "@/lib/db/queries";
import { getDb } from "@/lib/db/index";

export async function GET(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId") || "default";
    const rows = await getMessages(session.user.sub, conversationId, 100);

    return Response.json(rows);
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { conversationId, role, content } = await req.json();
    await saveMessage(session.user.sub, conversationId || "default", role, content);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId") || "default";
    const sql = getDb();
    await sql`DELETE FROM chat_messages WHERE user_id = ${session.user.sub} AND conversation_id = ${conversationId}`;

    return Response.json({ success: true });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
