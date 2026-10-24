// The agents' skill, filled in with this panel's address and the runner's
// limits.
import { readFile } from "node:fs/promises"
import path from "node:path"

import { publicUrl, runner } from "@/lib/runner-server"

export async function GET() {
  const [template, settings] = await Promise.all([
    readFile(path.join(process.cwd(), "skill.md"), "utf8"),
    runner()
      .settings()
      .catch(() => null),
  ])
  if (!settings) {
    return new Response("The panel can't reach the runner.\n", { status: 502 })
  }
  const values: Record<string, string> = {
    BASE: await publicUrl(),
    HEAP_MB: String(settings.heap_mb),
    CPU_SECONDS: String(settings.cpu_seconds),
    DISK_MB: String(settings.disk_mb),
  }
  const body = template.replace(
    /\{\{(\w+)\}\}/g,
    (m, k: string) => values[k] ?? m
  )
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  })
}
