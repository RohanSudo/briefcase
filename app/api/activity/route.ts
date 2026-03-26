import { auth0 } from "@/lib/auth0";
import { getActivityLog } from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const userId = session.user.sub;
    const entries = await getActivityLog(userId, 50);

    return Response.json(entries);
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
