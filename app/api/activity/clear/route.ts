import { auth0 } from "@/lib/auth0";
import { getDb } from "@/lib/db/index";

export async function DELETE() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const sql = getDb();
    await sql`DELETE FROM activity_log WHERE user_id = ${session.user.sub}`;

    return Response.json({ success: true });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
