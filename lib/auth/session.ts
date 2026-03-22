import { auth0 } from "@/lib/auth0";

export async function getAuthenticatedUser() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const sub = session.user.sub ?? "";
  const email = session.user.email ?? "";
  const name = session.user.name ?? email;

  return {
    id: sub,
    auth0Sub: sub,
    email,
    name,
  };
}
