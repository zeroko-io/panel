// The runner's API for the panel's own pages: the admin's session stands in
// for a token, and the server adds the root token. Changes must come from
// the panel's pages (same origin), so other sites can't use the session.
import type { NextRequest } from "next/server"

import { config } from "@/lib/config"
import { signedIn } from "@/lib/session"

const passed = ["content-type", "accept", "if-none-match", "range"]
const returned = [
  "content-type",
  "content-length",
  "content-disposition",
  "content-security-policy",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
]

function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status })
}

async function pass(
  req: NextRequest,
  ctx: RouteContext<"/runner-api/[...path]">
) {
  if (!(await signedIn())) {
    return fail(401, "unauthorized", "Sign in again.")
  }
  const unsafe = req.method !== "GET" && req.method !== "HEAD"
  const site = req.headers.get("sec-fetch-site")
  const origin = req.headers.get("origin")
  if (
    unsafe &&
    site !== "same-origin" &&
    (!origin || new URL(origin).host !== req.headers.get("host"))
  ) {
    return fail(403, "forbidden", "Changes must come from the panel.")
  }
  const { path } = await ctx.params
  if (path[0] !== "api") return fail(404, "not_found", "No such route.")
  const { runnerUrl, token } = config()
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  for (const h of passed) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  let res: Response
  try {
    res = await fetch(
      `${runnerUrl}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body: unsafe ? req.body : undefined,
        // @ts-expect-error: Node's fetch needs it to stream a request body.
        duplex: unsafe ? "half" : undefined,
        cache: "no-store",
        redirect: "manual",
        signal: req.signal,
      }
    )
  } catch {
    return fail(502, "runner_unreachable", "The panel can't reach the runner.")
  }
  const out = new Headers({ "cache-control": "no-store" })
  for (const h of returned) {
    const v = res.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(res.body, { status: res.status, headers: out })
}

export { pass as GET, pass as POST, pass as PUT, pass as PATCH, pass as DELETE }
