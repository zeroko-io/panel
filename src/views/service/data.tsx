"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActionButton,
  ErrorDetails,
  FileButton,
  Segmented,
} from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { confirm, toast } from "@/components/ui/feedback"
import { Input } from "@/components/ui/input"
import { Mono, SectionTitle } from "@/components/ui/ledger"
import { formatBytes, plural, relative } from "@/lib/format"
import type {
  FileList,
  Job,
  JobStatus,
  QueryResult,
  ServiceDetail,
  Store,
  Table,
} from "@/lib/runner"
import { cn } from "@/lib/utils"

import { useRunner } from "@/components/ui/runner"

/** Loads something on mount and when deps change; reload() loads it again.
 * Errors go to a toast. */
function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const ref = useRef(load)
  useEffect(() => {
    ref.current = load
  })
  const reload = useCallback(
    () => ref.current().then(setData, (err) => toast(err, true)),
    []
  )
  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, reload }
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-3 font-serif text-muted-foreground italic">{children}</p>
  )
}

/** Each binding of the live version, then the stores no binding uses. */
export function DataExplorer({
  service,
  stores,
}: {
  service: ServiceDetail
  stores: Store[]
}) {
  const runner = useRunner()
  const router = useRouter()
  const [cleared, setCleared] = useState(0)
  const bindings = service.bindings.filter(
    (b) => !b.type.startsWith("service:") && b.type !== "assets"
  )
  if (!bindings.length && !stores.length) {
    return (
      <Hint>
        No data bindings. Services declare db, files, jobs and realtime bindings
        when they deploy.
      </Hint>
    )
  }
  const clear = async (type: string, binding: string) => {
    if (!(await confirm(`Delete all data of ${binding}?`))) return
    await runner.deleteStore(service.name, type, binding)
    toast(`${binding} cleared`)
    setCleared((n) => n + 1)
    router.refresh()
  }
  const unbound = stores.filter((s) => !s.bound)
  return (
    <div className="flex flex-col gap-12">
      {bindings.map((b) => {
        const s = stores.find((x) => x.type === b.type && x.binding === b.name)
        return (
          <section key={`${b.name}:${cleared}`} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-3">
              <SectionTitle className="font-mono text-base">
                {b.name}
              </SectionTitle>
              <Mono className="text-brand">{b.type}</Mono>
              {s && (
                <Mono className="ml-auto">
                  {s.type === "files"
                    ? `${plural(s.count ?? 0, "file")} - ${formatBytes(s.bytes)}`
                    : formatBytes(s.bytes)}
                </Mono>
              )}
              {s && (
                <ActionButton
                  variant="link"
                  size="sm"
                  className="h-auto font-normal hover:text-destructive"
                  run={() => clear(b.type, b.name)}
                >
                  Clear
                </ActionButton>
              )}
            </div>
            {b.type === "db" ? (
              <Database service={service.name} binding={b.name} />
            ) : b.type === "files" ? (
              <Files
                service={service.name}
                binding={b.name}
                onChange={() => router.refresh()}
              />
            ) : b.type === "jobs" ? (
              <Jobs service={service} />
            ) : (
              <Realtime service={service} />
            )}
          </section>
        )
      })}
      {unbound.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>No longer bound</SectionTitle>
          <ul className="flex flex-col border-t">
            {unbound.map((s) => (
              <li
                key={`${s.type}:${s.binding}`}
                className="flex items-baseline gap-4 border-b border-rule py-2.5"
              >
                <span className="font-mono text-[13px]">{s.binding}</span>
                <Mono>
                  {s.type} - {formatBytes(s.bytes)}
                  {s.type === "files" && ` - ${plural(s.count ?? 0, "file")}`}
                </Mono>
                <ActionButton
                  variant="link"
                  size="sm"
                  className="ml-auto h-auto font-normal hover:text-destructive"
                  run={() => clear(s.type, s.binding)}
                >
                  Delete
                </ActionButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`

/** A db binding's tables, and a place to query it. */
function Database({ service, binding }: { service: string; binding: string }) {
  const runner = useRunner()
  const { data: tables, reload } = useLoad(
    () => runner.tables(service, binding),
    [service, binding]
  )
  const [sql, setSql] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const run = async (text: string) => {
    setSql(text)
    setBusy(true)
    setError("")
    try {
      setResult(await runner.query(service, binding, text))
      void reload()
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {tables === null ? (
        <Hint>Loading the tables.</Hint>
      ) : tables.length === 0 ? (
        <Hint>No tables.</Hint>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t: Table) => (
            <button
              key={t.name}
              type="button"
              title={t.sql}
              onClick={() => run(`SELECT * FROM ${quote(t.name)} LIMIT 100`)}
              className="inline-flex items-baseline gap-2 rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors hover:border-ring hover:bg-secondary/50"
            >
              {t.name}
              <span className="text-faint">{t.rows}</span>
            </button>
          ))}
        </div>
      )}
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          void run(sql)
        }}
      >
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={3}
          placeholder="SELECT * FROM ..."
          spellCheck={false}
          aria-label="SQL"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              e.currentTarget.form?.requestSubmit()
          }}
          className="rounded-lg border bg-field p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-faint focus-visible:border-ring"
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={busy || !sql.trim()}>
            {busy ? "Running" : "Run"}
          </Button>
          <Mono className="text-faint">Ctrl+Enter</Mono>
        </div>
      </form>
      {error && <ErrorDetails error={error} />}
      {result && <Results r={result} />}
    </div>
  )
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "object" && "$blob" in v) {
    const b64 = String((v as { $blob: string }).$blob)
    return `blob (${Math.floor((b64.length * 3) / 4)} bytes)`
  }
  return typeof v === "object" ? JSON.stringify(v) : String(v)
}

function Results({ r }: { r: QueryResult }) {
  if (!r.columns.length) {
    return (
      <Mono className="text-foreground">
        {plural(r.changes, "row")} changed.
      </Mono>
    )
  }
  return (
    <div className="flex animate-in flex-col gap-1.5 duration-200 fade-in">
      <div className="max-h-[480px] overflow-auto rounded-lg border">
        <table className="w-full border-collapse font-mono text-xs">
          <thead className="sticky top-0 bg-card">
            <tr>
              {r.columns.map((c, i) => (
                <th
                  key={i}
                  className="border-b px-3 py-2 text-left font-normal whitespace-nowrap text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i} className="hover:bg-secondary/50">
                {r.columns.map((c, j) => (
                  <td
                    key={j}
                    className={cn(
                      "max-w-[360px] truncate border-b border-rule px-3 py-1.5",
                      row[c] === null && "text-faint"
                    )}
                    title={cell(row[c])}
                  >
                    {cell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Mono className="text-faint">{plural(r.rows.length, "row")}</Mono>
    </div>
  )
}

const keyClass =
  "font-mono text-[13px] text-left wrap-anywhere underline-offset-4 hover:underline"

/** A files binding, browsed by "/" folders. */
function Files({
  service,
  binding,
  onChange,
}: {
  service: string
  binding: string
  onChange: () => void
}) {
  const runner = useRunner()
  const [prefix, setPrefix] = useState("")
  const [more, setMore] = useState<FileList | null>(null)
  const { data, reload } = useLoad(() => {
    setMore(null)
    return runner.files(service, binding, prefix)
  }, [service, binding, prefix])

  const files = [...(data?.files ?? []), ...(more?.files ?? [])]
  const folders = new Set<string>()
  const here = files.filter((f) => {
    const rest = f.key.slice(prefix.length)
    const slash = rest.indexOf("/")
    if (slash >= 0) folders.add(prefix + rest.slice(0, slash + 1))
    return slash < 0
  })
  const cursor = (more ?? data)?.cursor
  const up = prefix.slice(0, prefix.slice(0, -1).lastIndexOf("/") + 1)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {prefix && (
          <>
            <Button variant="link" size="sm" onClick={() => setPrefix(up)}>
              <ArrowLeft aria-hidden /> {up || "/"}
            </Button>
            <Mono className="text-foreground">{prefix}</Mono>
          </>
        )}
        <FileButton
          multiple
          size="sm"
          className="ml-auto"
          run={async (chosen) => {
            for (const f of chosen) {
              await runner.putFile(service, binding, prefix + f.name, f)
            }
            toast(`Uploaded ${plural(chosen.length, "file")}`)
            void reload()
            onChange()
          }}
        >
          Upload
        </FileButton>
      </div>
      {data === null ? (
        <Hint>Loading the files.</Hint>
      ) : !here.length && !folders.size ? (
        <Hint>No files{prefix && " here"}.</Hint>
      ) : (
        <ul className="flex flex-col border-t">
          {[...folders].map((f) => (
            <li key={f} className="border-b border-rule py-2.5">
              <button
                type="button"
                className={keyClass}
                onClick={() => setPrefix(f)}
              >
                {f.slice(prefix.length)}
              </button>
            </li>
          ))}
          {here.map((f) => (
            <li
              key={f.key}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-2.5"
            >
              <a
                className={keyClass}
                href={runner.fileUrl(service, binding, f.key)}
                target="_blank"
                rel="noreferrer"
              >
                {f.key.slice(prefix.length)}
              </a>
              <Mono className="text-faint">{f.type}</Mono>
              <Mono className="ml-auto">
                {formatBytes(f.size)} - {relative(f.uploaded)}
              </Mono>
              <Button
                variant="link"
                size="sm"
                className="h-auto font-normal"
                asChild
              >
                <a href={runner.fileUrl(service, binding, f.key, true)}>
                  Download
                </a>
              </Button>
              <ActionButton
                variant="link"
                size="sm"
                className="h-auto font-normal hover:text-destructive"
                run={async () => {
                  if (!(await confirm(`Delete ${f.key}?`))) return
                  await runner.deleteFile(service, binding, f.key)
                  void reload()
                  onChange()
                }}
              >
                Delete
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <ActionButton
          variant="link"
          size="sm"
          className="self-start"
          run={async () => {
            const r = await runner.files(service, binding, prefix, cursor)
            setMore({
              files: [...(more?.files ?? []), ...r.files],
              cursor: r.cursor,
            })
          }}
        >
          Load more
        </ActionButton>
      )}
    </div>
  )
}

const statuses = ["", "queued", "running", "dead"] as const

/** The service's jobs, and a way to send one. */
function Jobs({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const [status, setStatus] = useState<(typeof statuses)[number]>("")
  const { data, reload } = useLoad(
    () =>
      runner.jobs(service.name, (status || undefined) as JobStatus | undefined),
    [service.name, status]
  )
  useEffect(() => {
    const id = setInterval(() => document.hidden || void reload(), 5000)
    return () => clearInterval(id)
  }, [reload])
  const [open, setOpen] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          options={statuses.map(
            (s) =>
              [
                s,
                s ? (
                  <>
                    {s} <span className="text-faint">{service.jobs[s]}</span>
                  </>
                ) : (
                  "all"
                ),
              ] as const
          )}
        />
        <Button
          variant={sending ? "ghost" : "outline"}
          size="sm"
          className="ml-auto"
          aria-expanded={sending}
          onClick={() => setSending(!sending)}
        >
          {sending ? "Cancel" : "Send a job"}
        </Button>
      </div>
      {sending && (
        <form
          className="flex animate-in flex-col gap-3 rounded-lg border bg-card p-4 duration-200 fade-in slide-in-from-top-1"
          onSubmit={async (e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            let payload
            try {
              payload = JSON.parse(String(f.get("payload")) || "null")
            } catch {
              toast("The payload must be JSON.", true)
              return
            }
            try {
              const j = await runner.sendJob(
                service.name,
                payload,
                Number(f.get("delay")) || 0
              )
              toast(`Job #${j.id} queued`)
              setSending(false)
              void reload()
            } catch (err) {
              toast(err, true)
            }
          }}
        >
          <textarea
            name="payload"
            rows={4}
            defaultValue="{}"
            spellCheck={false}
            aria-label="Payload, as JSON"
            className="rounded-lg border bg-field p-3 font-mono text-xs outline-none focus-visible:border-ring"
          />
          <div className="flex items-center gap-2.5">
            <Input
              name="delay"
              type="number"
              min={0}
              defaultValue={0}
              aria-label="Delay in seconds"
              className="w-24 font-mono"
            />
            <span className="text-[13px] text-muted-foreground">
              seconds of delay
            </span>
            <Button size="sm" className="ml-auto">
              Send
            </Button>
          </div>
        </form>
      )}
      {data === null ? (
        <Hint>Loading the jobs.</Hint>
      ) : data.length === 0 ? (
        <Hint>No jobs{status && ` ${status}`}.</Hint>
      ) : (
        <ul className="flex flex-col border-t">
          {data.map((j: Job) => (
            <li
              key={j.id}
              className="flex flex-col gap-1.5 border-b border-rule py-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <button
                  type="button"
                  className={keyClass}
                  aria-expanded={open === j.id}
                  onClick={() => setOpen(open === j.id ? null : j.id)}
                >
                  #{j.id}
                </button>
                <Mono
                  className={
                    j.status === "dead"
                      ? "text-destructive"
                      : j.status === "running"
                        ? "text-ok"
                        : "text-foreground"
                  }
                >
                  {j.status}
                </Mono>
                {j.cron && <Mono>{j.cron}</Mono>}
                {j.key && <Mono className="truncate">{j.key}</Mono>}
                <Mono className="ml-auto">
                  {j.status === "queued"
                    ? `runs ${relative(j.run_at)}`
                    : `queued ${relative(j.created_at)}`}{" "}
                  - attempt {j.attempts} of {j.max_attempts}
                </Mono>
                {j.status === "dead" && (
                  <ActionButton
                    variant="link"
                    size="sm"
                    className="h-auto font-normal"
                    run={() => runner.retryJob(service.name, j.id).then(reload)}
                  >
                    Retry
                  </ActionButton>
                )}
                {j.status !== "running" && (
                  <ActionButton
                    variant="link"
                    size="sm"
                    className="h-auto font-normal hover:text-destructive"
                    run={() =>
                      runner.deleteJob(service.name, j.id).then(reload)
                    }
                  >
                    Delete
                  </ActionButton>
                )}
              </div>
              {open !== j.id && (
                <Mono className="truncate text-faint">{j.payload}</Mono>
              )}
              {j.error && <ErrorDetails error={j.error} />}
              {open === j.id && (
                <pre className="animate-in overflow-auto rounded-lg border bg-field p-3 font-mono text-xs duration-200 fade-in">
                  {JSON.stringify(JSON.parse(j.payload), null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The open connections, and a way to publish to a channel. */
function Realtime({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {plural(service.connections, "connection")} open.
      </p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const raw = String(f.get("data"))
          let data: unknown = raw
          try {
            data = JSON.parse(raw)
          } catch {
            // plain text
          }
          setBusy(true)
          try {
            const r = await runner.publish(
              service.name,
              String(f.get("channel")),
              data
            )
            toast(`Delivered to ${plural(r.delivered, "connection")}`)
          } catch (err) {
            toast(err, true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Input
          name="channel"
          placeholder="channel"
          required
          aria-label="Channel"
          className="w-48 font-mono"
        />
        <Input
          name="data"
          placeholder='{"hello": "world"}'
          required
          aria-label="Message"
          className="min-w-48 flex-1 font-mono"
        />
        <Button variant="outline" disabled={busy}>
          {busy ? "Publishing" : "Publish"}
        </Button>
      </form>
    </div>
  )
}
