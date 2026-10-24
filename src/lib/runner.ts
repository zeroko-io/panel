// A client for a runner's API. On a server it carries a token; in a browser
// it has none and calls a path of the panel that adds it (base is that
// path). The types follow the runner's JSON.

export type ServiceStatus = "running" | "stopped" | "not_deployed"

export type BindingType =
  "db" | "files" | "jobs" | "realtime" | "assets" | `service:${string}`

export type Cron = { schedule: string; payload?: unknown }

export type Manifest = {
  main: string
  bindings?: Record<string, BindingType>
  crons?: Cron[]
  vars?: Record<string, string>
  assets?: number
}

export type Deployment = {
  id: string
  number: number
  status: "ready" | "failed"
  error?: string
  created_at: number
}

export type Service = {
  id: string
  name: string
  created_at: number
  active_deployment?: string
  stopped: boolean
  egress: string[] // hosts it may reach; "*" is any
  disk_mb: number // 0: the runner's default
  url: string // "" while the runner has no domain
  status: ServiceStatus
  version?: number
  latest?: Deployment
  traffic?: Traffic // when listed with a period
}

export type Traffic = {
  requests: number
  errors: number
  exceptions: number
  outbound: number
  outbound_errors: number
}

export type Process = {
  pid: number
  started: number
  busy: number
  memory: number
  cpu: number
}

export type Var = { name: string; value: string; updated_at: number }

export type ServiceDetail = Service & {
  deployment?: Deployment
  manifest?: Manifest
  bindings: {
    name: string
    type: BindingType
    bytes?: number
    count?: number
  }[]
  jobs: { queued: number; running: number; dead: number }
  connections: number
  bytes: number
  disk_quota: number
  process?: Process
  vars: Var[]
}

export type DeploymentView = Deployment & {
  active: boolean
  manifest: Manifest
}

export type Source = { main: string; files: Record<string, string | null> }

export type LogSource = "request" | "console" | "fetch" | "runtime"

export type LogEntry = {
  id: number
  deployment: string
  ts: number
  source: LogSource
  level: string
  message: string
}

export type MetricsPoint = {
  t: number
  requests: number
  errors: number
  exceptions: number
  outbound: number
  outbound_errors: number
  p50: number // ms, a bucket's upper bound; -1: longer than the last
  p95: number
}

export type Period = "1h" | "24h" | "7d" | "30d"

export type Metrics = {
  period: Period
  step: number // seconds
  points: MetricsPoint[]
  totals: MetricsPoint
}

export type Secret = { name: string; updated_at: number }

export type Store = {
  type: "db" | "files"
  binding: string
  bytes: number
  count?: number
  bound: boolean
}

export type Table = { name: string; sql: string; rows: number }

export type QueryResult = {
  rows: Record<string, unknown>[]
  columns: string[]
  changes: number
  lastRowId: number
}

export type FileInfo = {
  key: string
  size: number
  type: string
  etag: string
  uploaded: number
}

export type FileList = { files: FileInfo[]; cursor?: string }

export type JobStatus = "queued" | "running" | "dead"

export type Job = {
  id: number
  payload: string // JSON
  key?: string
  cron?: string
  status: JobStatus
  attempts: number
  max_attempts: number
  run_at: number
  error?: string
  created_at: number
}

export type Token = {
  id: string
  name: string
  prefix: string
  created_at: number
  last_used_at: number
  expires_at: number // 0: never
}

export type Settings = {
  domain: string
  separator?: "." | "--" // between a service's name and the domain
  public_scheme: string
  max_body_mb: number
  heap_mb: number
  cpu_seconds: number
  idle_seconds: number
  max_processes: number
  disk_mb: number
  egress: boolean
}

export type System = {
  version: string
  workerd: string
  started: number
  services: number
  processes: (Process & { service: string })[]
  disk: { total: number; free: number }
  data_bytes: number
}

export type SystemLine = { seq: number; ts: number; message: string }

export class RunnerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

const enc = encodeURIComponent

export class Runner {
  constructor(
    readonly base: string,
    private readonly token?: string
  ) {}

  /** Calls the runner's API: path starts with /api. */
  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`)
    if (typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
    return fetch(this.base + path, { ...init, headers, cache: "no-store" })
  }

  /** The address of a runner path, for links and downloads. */
  url(path: string): string {
    return this.base + path
  }

  private async read<T>(res: Response, ok = res.ok): Promise<T> {
    if (!ok) {
      const body = await res.json().catch(() => null)
      throw new RunnerError(
        res.status,
        body?.error?.code ?? "error",
        body?.error?.message ?? `The runner answered ${res.status}.`
      )
    }
    return (res.status === 204 ? undefined : await res.json()) as T
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    return this.read<T>(await this.fetch(path, init))
  }

  private send<T>(method: string, path: string, body?: unknown) {
    return this.call<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  private raw<T>(method: string, path: string, body: Blob, type: string) {
    return this.call<T>(path, {
      method,
      body,
      headers: { "Content-Type": type },
    })
  }

  private svc = (name: string, rest = "") => `/api/services/${enc(name)}${rest}`

  /** The services; with a period, each with its traffic over it (runners
   * from before that leave traffic out). */
  services = (period?: Period) =>
    this.call<Service[]>(`/api/services${period ? `?period=${period}` : ""}`)
  service = (name: string) => this.call<ServiceDetail>(this.svc(name))
  createService = (name: string) =>
    this.send<Service>("POST", "/api/services", { name })
  deleteService = (name: string) => this.send<void>("DELETE", this.svc(name))
  stop = (name: string) => this.send<Service>("POST", this.svc(name, "/stop"))
  start = (name: string) => this.send<Service>("POST", this.svc(name, "/start"))
  setLimits = (name: string, limits: { egress?: string[]; disk_mb?: number }) =>
    this.send<Service>("PATCH", this.svc(name), limits)

  deployments = (name: string) =>
    this.call<DeploymentView[]>(this.svc(name, "/deployments"))
  /** Deploys a version; a version that fails to build comes back with
   * status "failed" rather than as an error. */
  deploy = async (name: string, body: unknown) => {
    const res = await this.fetch(this.svc(name, "/deployments"), {
      method: "POST",
      body: JSON.stringify(body),
    })
    const out = await this.read<{ deployment: Deployment }>(
      res,
      res.ok || res.status === 422
    )
    return out.deployment
  }
  activate = (name: string, id: string) =>
    this.send<Deployment>(
      "POST",
      this.svc(name, `/deployments/${enc(id)}/activate`)
    )
  source = (name: string, id: string) =>
    this.call<Source>(this.svc(name, `/deployments/${enc(id)}/source`))
  bundleUrl = (name: string, id: string) =>
    this.url(this.svc(name, `/deployments/${enc(id)}/bundle`))
  metrics = (name: string, period: Period = "24h") =>
    this.call<Metrics>(this.svc(name, `/metrics?period=${period}`))
  runCron = (name: string, schedule: string) =>
    this.send<Job>("POST", this.svc(name, "/crons/run"), { schedule })

  /** A service's logs after an id; with wait, holds the request up to that
   * many seconds until there are some. Without after, the newest. */
  logs = (
    name: string,
    opts: { after?: number; limit?: number; wait?: number } = {}
  ) =>
    this.call<LogEntry[]>(
      this.svc(
        name,
        `/logs?after=${opts.after ?? 0}&limit=${opts.limit ?? 200}&wait=${opts.wait ?? 0}`
      )
    )

  secrets = (name: string) => this.call<Secret[]>(this.svc(name, "/secrets"))
  putSecret = (name: string, key: string, value: string) =>
    this.send<void>("PUT", this.svc(name, `/secrets/${enc(key)}`), { value })
  deleteSecret = (name: string, key: string) =>
    this.send<void>("DELETE", this.svc(name, `/secrets/${enc(key)}`))
  putVar = (name: string, key: string, value: string) =>
    this.send<void>("PUT", this.svc(name, `/vars/${enc(key)}`), { value })
  deleteVar = (name: string, key: string) =>
    this.send<void>("DELETE", this.svc(name, `/vars/${enc(key)}`))

  storage = (name: string) => this.call<Store[]>(this.svc(name, "/storage"))
  deleteStore = (name: string, type: string, binding: string) =>
    this.send<void>(
      "DELETE",
      this.svc(name, `/storage/${type}/${enc(binding)}`)
    )
  deleteStorage = (name: string) =>
    this.send<void>("DELETE", this.svc(name, "/storage"))
  exportUrl = (name: string) => this.url(this.svc(name, "/export"))
  importData = (name: string, file: Blob) =>
    this.raw<{ stores: string[] }>(
      "POST",
      this.svc(name, "/import"),
      file,
      "application/gzip"
    )

  tables = (name: string, binding: string) =>
    this.call<Table[]>(this.svc(name, `/db/${enc(binding)}/tables`))
  query = (name: string, binding: string, sql: string) =>
    this.send<QueryResult[]>(
      "POST",
      this.svc(name, `/db/${enc(binding)}/query`),
      {
        sql,
      }
    ).then((r) => r[0]!)

  files = (name: string, binding: string, prefix = "", cursor = "") =>
    this.call<FileList>(
      this.svc(
        name,
        `/files/${enc(binding)}?prefix=${enc(prefix)}&cursor=${enc(cursor)}&limit=200`
      )
    )
  fileUrl = (name: string, binding: string, key: string, download = false) =>
    this.url(
      this.svc(
        name,
        `/files/${enc(binding)}/file?key=${enc(key)}${download ? "&download=1" : ""}`
      )
    )
  putFile = (name: string, binding: string, key: string, file: File) =>
    this.raw<FileInfo>(
      "PUT",
      this.svc(name, `/files/${enc(binding)}/file?key=${enc(key)}`),
      file,
      file.type || "application/octet-stream"
    )
  deleteFile = (name: string, binding: string, key: string) =>
    this.send<void>(
      "DELETE",
      this.svc(name, `/files/${enc(binding)}/file?key=${enc(key)}`)
    )

  jobs = (name: string, status?: JobStatus) =>
    this.call<Job[]>(
      this.svc(name, `/jobs${status ? `?status=${status}` : ""}`)
    )
  sendJob = (name: string, payload: unknown, delay = 0) =>
    this.send<Job>("POST", this.svc(name, "/jobs"), { payload, delay })
  retryJob = (name: string, id: number) =>
    this.send<void>("POST", this.svc(name, `/jobs/${id}/retry`))
  deleteJob = (name: string, id: number) =>
    this.send<void>("DELETE", this.svc(name, `/jobs/${id}`))

  publish = (name: string, channel: string, data: unknown) =>
    this.send<{ delivered: number }>(
      "POST",
      this.svc(name, "/realtime/publish"),
      {
        channel,
        data,
      }
    )

  tokens = () => this.call<Token[]>("/api/tokens")
  createToken = (name: string, expiresInDays = 0) =>
    this.send<{ secret: string; token: Token }>("POST", "/api/tokens", {
      name,
      expires_in_days: expiresInDays,
    })
  deleteToken = (id: string) =>
    this.send<void>("DELETE", `/api/tokens/${enc(id)}`)

  settings = () => this.call<Settings>("/api/settings")
  /** Changes settings; the runner restarts with them. */
  setSettings = (s: Partial<Settings>) =>
    this.send<Settings>("PATCH", "/api/settings", s)
  system = () => this.call<System>("/api/system")
  systemLogs = (after = 0) =>
    this.call<SystemLine[]>(`/api/system/logs?after=${after}`)
  backupUrl = () => this.url("/api/system/backup")
  /** Replaces all of the runner's data with a backup's; it restarts. */
  restore = (file: Blob) =>
    this.raw<{ restarting: boolean }>(
      "POST",
      "/api/system/restore",
      file,
      "application/gzip"
    )

  /** Waits until the runner answers again, after a restart. */
  async back(timeoutMs = 30_000): Promise<boolean> {
    const until = Date.now() + timeoutMs
    while (Date.now() < until) {
      await new Promise((done) => setTimeout(done, 400))
      if (
        await this.system().then(
          () => true,
          () => false
        )
      )
        return true
    }
    return false
  }
}
