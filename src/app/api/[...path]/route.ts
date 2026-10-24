// The runner's API, for agents, at the panel's address: requests pass
// through with their own token. The panel adds nothing to them, so a call
// here can do exactly what the token can do on the runner.
import type { NextRequest } from "next/server"

import { config } from "@/lib/config"

const passed = [
  "authorization",
  "content-type",
  "accept",
  "if-none-match",
  "range",
]

async function pass(req: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params
  const url = `${config().runnerUrl}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`
  const headers = new Headers()
  for (const h of passed) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  let res: Response
  try {
    res = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error: Node's fetch needs it to stream a request body.
      duplex: hasBody ? "half" : undefined,
      cache: "no-store",
      redirect: "manual",
    })
  } catch {
    return Response.json(
      {
        error: {
          code: "runner_unreachable",
          message: "The panel can't reach the runner.",
        },
      },
      { status: 502 }
    )
  }
  const out = new Headers()
  for (const h of [
    "content-type",
    "content-length",
    "etag",
    "content-disposition",
    "content-security-policy",
    "last-modified",
    "accept-ranges",
    "content-range",
  ]) {
    const v = res.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(res.body, { status: res.status, headers: out })
}

export { pass as GET, pass as POST, pass as PUT, pass as PATCH, pass as DELETE }
