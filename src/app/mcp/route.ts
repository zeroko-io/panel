// The runner's MCP server, for agents, at the panel's address: requests
// pass through with their own token, as the API's do (see api/[...path]).
import type { NextRequest } from "next/server"

import { config } from "@/lib/config"

async function pass(req: NextRequest) {
  const headers = new Headers()
  for (const h of [
    "authorization",
    "content-type",
    "accept",
    "mcp-protocol-version",
  ]) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }
  let res: Response
  try {
    res = await fetch(`${config().runnerUrl}/mcp`, {
      method: req.method,
      headers,
      body: req.method === "POST" ? await req.text() : undefined,
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
  for (const h of ["content-type", "allow", "www-authenticate"]) {
    const v = res.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(res.body, { status: res.status, headers: out })
}

export { pass as DELETE, pass as GET, pass as POST }
