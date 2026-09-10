import { cookies } from "next/headers";

const COOKIE = "ng_anon";

export async function getAnonymousId() {
  const store = await cookies();
  let id = store.get(COOKIE)?.value;
  if (!id) {
    id = crypto.randomUUID();
    store.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return id;
}
