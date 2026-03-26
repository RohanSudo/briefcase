import { auth0 } from "@/lib/auth0";
import { getHitlSetting, setHitlSetting } from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const hitlEnabled = await getHitlSetting(session.user.sub);
    return Response.json({ hitlEnabled });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { hitlEnabled } = await req.json();
    await setHitlSetting(session.user.sub, hitlEnabled);
    return Response.json({ success: true, hitlEnabled });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
