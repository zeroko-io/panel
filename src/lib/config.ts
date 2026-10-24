// The panel's settings, from its environment. Server code only.

export type Config = {
  runnerUrl: string // the runner's API, e.g. http://runner:8081
  token: string // the runner's root token
  password: string // the admin's password
  publicUrl?: string // the panel's own address, when headers can't tell it
}

let cached: Config | undefined

export function config(): Config {
  if (cached) return cached
  const token = process.env.ZEROKO_TOKEN ?? ""
  const password = process.env.ZEROKO_PANEL_PASSWORD ?? ""
  if (token.length < 32) {
    throw new Error("ZEROKO_TOKEN must be the runner's root token.")
  }
  if (password.length < 8) {
    throw new Error("ZEROKO_PANEL_PASSWORD must be at least 8 characters.")
  }
  cached = {
    runnerUrl: (
      process.env.ZEROKO_RUNNER_URL ?? "http://localhost:8081"
    ).replace(/\/+$/, ""),
    token,
    password,
    publicUrl: process.env.ZEROKO_PANEL_URL?.replace(/\/+$/, "") || undefined,
  }
  return cached
}
