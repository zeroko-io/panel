// Whether newer releases of the panel and the runner are out: their GitHub
// releases, asked at most every six hours. A repository that can't be read
// (private, offline, rate limited) means no news, never an error.

export const panelVersion = process.env.ZEROKO_PANEL_VERSION ?? "dev"

export type Release = { version: string; url: string }

export type Update = Release & { name: string; current: string }

const repos = {
  panel: "zeroko-io/panel",
  runner: "zeroko-io/runner",
} as const

async function latest(repo: string): Promise<Release | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "zeroko-panel",
        },
        next: { revalidate: 6 * 60 * 60 },
        signal: AbortSignal.timeout(3000),
      }
    )
    if (!res.ok) return null
    const r = (await res.json()) as { tag_name?: string; html_url?: string }
    if (!r.tag_name || !r.html_url) return null
    return { version: r.tag_name.replace(/^v/, ""), url: r.html_url }
  } catch {
    return null
  }
}

/** "0.2.0+abc", "0.2.0-dev": the numbers, and whether it's a pre-release. */
function parse(v: string): { nums: number[]; pre: boolean } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(-[^+]*)?/.exec(v)
  if (!m) return null
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: !!m[4] }
}

/** Whether release a is newer than the version b runs. */
function newer(a: string, b: string): boolean {
  const x = parse(a)
  const y = parse(b)
  if (!x || !y) return false
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i]! > y.nums[i]!
  }
  return !x.pre && y.pre
}

/** The updates there are for this panel and the runner it manages. */
export async function updates(runnerVersion: string): Promise<Update[]> {
  const current = { panel: panelVersion, runner: runnerVersion }
  const found = await Promise.all(
    (Object.keys(repos) as (keyof typeof repos)[]).map(async (name) => {
      const r = await latest(repos[name])
      return r && newer(r.version, current[name])
        ? {
            ...r,
            name: name === "panel" ? "Zeroko Panel" : "The runner",
            current: current[name],
          }
        : null
    })
  )
  return found.filter((u) => u !== null)
}
