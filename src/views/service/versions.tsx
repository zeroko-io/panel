"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, Download, Rocket } from "lucide-react"
import { useEffect, useState } from "react"
import {
  ActionButton,
  ErrorDetails,
  FileButton,
  Indicator,
} from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { confirm, toast } from "@/components/ui/feedback"
import { Input } from "@/components/ui/input"
import { Mono } from "@/components/ui/ledger"
import { relative } from "@/lib/format"
import type {
  Deployment,
  DeploymentView,
  ServiceDetail,
  Source,
} from "@/lib/runner"
import { cn } from "@/lib/utils"

import { useRunner } from "@/components/ui/runner"

const SHOWN = 8

export function Versions({
  service,
  deployments,
}: {
  service: ServiceDetail
  deployments: DeploymentView[]
}) {
  const runner = useRunner()
  const router = useRouter()
  const [all, setAll] = useState(false)
  const [writing, setWriting] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const list = all ? deployments : deployments.slice(0, SHOWN)

  const deployed = (d: Deployment) => {
    if (d.status === "ready") toast(`v${d.number} is live`)
    else
      toast(
        `v${d.number} failed${d.error ? `: ${d.error.split("\n")[0]}` : ""}`,
        true
      )
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <FileButton
          accept=".json,application/json"
          run={async ([file]) => {
            let body
            try {
              body = JSON.parse(await file!.text())
            } catch {
              throw new Error(
                `${file!.name} is not a deployment; download one from this list.`
              )
            }
            if (
              !(await confirm(
                `Deploy ${file!.name} to ${service.name}?`,
                "Deploy",
                { danger: false }
              ))
            )
              return
            deployed(await runner.deploy(service.name, body))
          }}
        >
          Upload a bundle
        </FileButton>
        <Button
          variant={writing ? "ghost" : "default"}
          aria-expanded={writing}
          onClick={() => setWriting(!writing)}
        >
          {writing ? "Cancel" : "Deploy code"}
        </Button>
      </div>

      {writing && (
        <QuickDeploy
          service={service}
          onDone={(d) => {
            setWriting(false)
            deployed(d)
          }}
        />
      )}

      {deployments.length === 0 ? (
        <p className="py-10 text-center font-serif text-muted-foreground italic">
          Not deployed yet. Agents deploy through the API; the skill says how.
        </p>
      ) : (
        <ul className="flex flex-col border-t">
          {list.map((d) => (
            <VersionRow
              key={d.id}
              service={service.name}
              d={d}
              open={open === d.id}
              onToggle={() => setOpen(open === d.id ? null : d.id)}
              onActivate={async () => {
                if (
                  !(await confirm(
                    `Make v${d.number} live? It starts answering at once, with the data the service has now.`,
                    "Make it live",
                    { danger: false }
                  ))
                )
                  return
                await runner.activate(service.name, d.id)
                toast(`v${d.number} is live`)
                router.refresh()
              }}
            />
          ))}
        </ul>
      )}
      {deployments.length > SHOWN && (
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show all ${deployments.length}`}
        </Button>
      )}
    </div>
  )
}

function VersionRow({
  service,
  d,
  open,
  onToggle,
  onActivate,
}: {
  service: string
  d: DeploymentView
  open: boolean
  onToggle: () => void
  onActivate: () => Promise<void>
}) {
  const runner = useRunner()
  const [source, setSource] = useState<Source | null>(null)
  const [error, setError] = useState("")
  // Drawn once opened, and kept, so closing can animate too.
  const [drawn, setDrawn] = useState(open)
  const m = d.manifest
  const bindings = Object.keys(m?.bindings ?? {})
  const panel = `version-${d.id}`

  // Drawn from the first time it opens: set while rendering, React's way
  // for state that follows a prop.
  if (open && !drawn) setDrawn(true)

  useEffect(() => {
    if (!open || source) return
    let stale = false
    runner.source(service, d.id).then(
      (s) => stale || setSource(s),
      (err) =>
        stale || setError(err instanceof Error ? err.message : String(err))
    )
    return () => {
      stale = true
    }
  }, [open, source, service, d.id, runner])

  return (
    <li className="border-b border-rule">
      <div className="relative flex flex-col gap-2 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panel}
            onClick={onToggle}
            className="group flex items-center gap-4 text-left outline-none after:absolute after:inset-0 focus-visible:after:bg-secondary/40"
          >
            <span
              className={cn(
                "font-serif text-xl transition-colors",
                !d.active && "text-muted-foreground group-hover:text-foreground"
              )}
            >
              v{d.number}
            </span>
            {d.active && <Mono className="text-brand">live</Mono>}
            {d.status === "failed" && (
              <Mono className="text-destructive">failed</Mono>
            )}
            <Mono>{relative(d.created_at)}</Mono>
          </button>
          <div
            className={cn(
              "relative z-10 ml-auto flex items-center gap-2 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
              open
                ? "translate-x-0 opacity-100"
                : "pointer-events-none translate-x-2 opacity-0"
            )}
            inert={!open}
          >
            <Button variant="outline" size="sm" asChild>
              <a
                href={runner.bundleUrl(service, d.id)}
                download
                title="The version as one file, to deploy it again here or elsewhere"
              >
                <Download aria-hidden /> Download
              </a>
            </Button>
            {d.status === "ready" && !d.active && (
              <ActionButton size="sm" pending="Deploying" run={onActivate}>
                <Rocket aria-hidden /> Make it live
              </ActionButton>
            )}
          </div>
          <ChevronDown
            aria-hidden
            className={cn(
              "pointer-events-none size-4 text-muted-foreground transition-transform duration-300",
              open && "rotate-180"
            )}
          />
        </div>
        <div className="pointer-events-none flex flex-wrap gap-x-5 gap-y-1">
          {m?.main && <Mono className="text-foreground">{m.main}</Mono>}
          {bindings.length > 0 && <Mono>{bindings.join(", ")}</Mono>}
          {!!m?.crons?.length && (
            <Mono>{m.crons.map((c) => c.schedule).join(", ")}</Mono>
          )}
          <Mono className="text-faint">{d.id}</Mono>
        </div>
      </div>
      {d.error && <ErrorDetails error={d.error} className="-mt-1 pb-4" />}
      <div
        id={panel}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          {drawn && (
            <div className="flex flex-col gap-4 pb-5">
              {error ? (
                <ErrorDetails error={error} />
              ) : source ? (
                <SourceView source={source} />
              ) : (
                <p className="h-24 animate-pulse rounded-lg border bg-field" />
              )}
              {d.active && <Mono>This is the live version.</Mono>}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/** The files of a version, as they were sent. */
function SourceView({ source }: { source: Source }) {
  const names = Object.keys(source.files).sort((a, b) =>
    a === source.main ? -1 : b === source.main ? 1 : a.localeCompare(b)
  )
  const [file, setFile] = useState(names[0] ?? "")
  const text = source.files[file]
  return (
    <div className="flex flex-col gap-2">
      {names.length > 1 && (
        <div className="relative flex flex-wrap gap-1">
          <Indicator />
          {names.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === file}
              onClick={() => setFile(n)}
              className={cn(
                "relative rounded-sm px-2 py-0.5 font-mono text-xs transition-colors",
                n === file
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <pre className="max-h-[440px] overflow-auto rounded-lg border bg-field p-4 font-mono text-xs leading-relaxed">
        {text ?? "A binary file."}
      </pre>
    </div>
  )
}

const SAMPLE = `export default {
  async fetch(request, env) {
    return Response.json({ hello: "world" });
  },
};
`

/** Deploys one module, keeping the bindings, crons and vars of the live
 * version. */
function QuickDeploy({
  service,
  onDone,
}: {
  service: ServiceDetail
  onDone: (d: Deployment) => void
}) {
  const runner = useRunner()
  const [busy, setBusy] = useState(false)
  const m = service.manifest
  return (
    <form
      className="flex animate-in flex-col gap-4 rounded-lg border bg-card p-5 duration-200 fade-in slide-in-from-top-1"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const main = String(f.get("main")).trim()
        setBusy(true)
        try {
          onDone(
            await runner.deploy(service.name, {
              main,
              files: { [main]: String(f.get("code")) },
              bindings: m?.bindings,
              crons: m?.crons,
              vars: m?.vars,
            })
          )
        } catch (err) {
          toast(err, true)
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="kicker">Main module</span>
        <Input
          name="main"
          defaultValue={m?.main ?? "index.js"}
          required
          className="max-w-xs font-mono"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="kicker">Code</span>
        <textarea
          name="code"
          rows={12}
          defaultValue={SAMPLE}
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              e.currentTarget.form?.requestSubmit()
          }}
          className="rounded-lg border bg-field p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring"
        />
      </label>
      <p className="text-[13px] text-muted-foreground">
        Keeps the live version&apos;s bindings, crons and vars.
      </p>
      <div>
        <Button disabled={busy}>{busy ? "Deploying" : "Deploy"}</Button>
      </div>
    </form>
  )
}
