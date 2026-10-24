// The admin's session: a signed cookie holding its expiry. Its key comes
// from the root token and the password, so changing either signs everyone
// out. Server code only.
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { config } from "./config"

const COOKIE = "zeroko_session"
const DAYS = 14

function sign(value: string): string {
  const { token, password } = config()
  const key = createHash("sha256")
    .update(`zeroko panel session\0${token}\0${password}`)
    .digest()
  return createHmac("sha256", key).update(value).digest("base64url")
}

function same(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function checkPassword(given: string): boolean {
  return same(given, config().password)
}

/** Whether the panel is served over HTTPS, as far as its proxy says. */
async function secure(): Promise<boolean> {
  const h = await headers()
  return (
    h.get("x-forwarded-proto") === "https" ||
    (config().publicUrl?.startsWith("https:") ?? false)
  )
}

export async function startSession() {
  const expires = Date.now() + DAYS * 24 * 60 * 60 * 1000
  ;(await cookies()).set(COOKIE, `${expires}.${sign(String(expires))}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: await secure(),
    path: "/",
    expires: new Date(expires),
  })
}

export async function endSession() {
  ;(await cookies()).delete(COOKIE)
}

export async function signedIn(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value
  const [expires, mac] = value?.split(".") ?? []
  if (!expires || !mac || !(Number(expires) > Date.now())) return false
  return same(mac, sign(expires))
}

/** Sends to the sign-in page unless signed in. Call it in every page and
 * every Server Action. */
export async function requireSession() {
  if (!(await signedIn())) redirect("/login")
}
