"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ActionButton, FileButton, Segmented } from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { confirm, toast } from "@/components/ui/feedback"
import { Input } from "@/components/ui/input"
import { Meter, Mono, SectionTitle } from "@/components/ui/ledger"
import { formatBytes, plural, relative } from "@/lib/format"
import type { Secret, ServiceDetail } from "@/lib/runner"

import { usePanelRoot, useRunner } from "@/components/ui/runner"

/** A section of the settings: a title and what it is about on the left,
 * its controls on the right. */
function Section({
  title,
  about,
  danger,
  children,
}: {
  title: string
  about: React.ReactNode
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-4 border-b border-rule py-8 first:pt-2 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
      <div className="flex flex-col gap-1.5">
        <SectionTitle className={danger ? "text-destructive" : undefined}>
          {title}
        </SectionTitle>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {about}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

/** Runs a form's submit as an action: busy while it runs, errors toasted. */
function useSubmit(run: (f: FormData, form: HTMLFormElement) => Promise<void>) {
  const [busy, setBusy] = useState(false)
  return {
    busy,
    onSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      setBusy(true)
      try {
        await run(new FormData(form), form)
      } catch (err) {
        toast(err, true)
      } finally {
        setBusy(false)
      }
    },
  }
}

export function ServiceSettings({
  service,
  secrets,
  egressAllowed,
}: {
  service: ServiceDetail
  secrets: Secret[]
  egressAllowed: boolean
}) {
  return (
    <div className="flex flex-col">
      <Egress service={service} allowed={egressAllowed} />
      <Disk service={service} />
      <Vars service={service} />
      <Secrets service={service} secrets={secrets} />
      <Transfer service={service} />
      <Danger service={service} />
    </div>
  )
}

const modes = [
  ["any", "Any host"],
  ["list", "Only these"],
  ["none", "None"],
] as const

function Egress({
  service,
  allowed,
}: {
  service: ServiceDetail
  allowed: boolean
}) {
  const runner = useRunner()
  const router = useRouter()
  const [mode, setMode] = useState<(typeof modes)[number][0]>(
    service.egress.includes("*")
      ? "any"
      : service.egress.length
        ? "list"
        : "none"
  )
  const [hosts, setHosts] = useState(
    service.egress.filter((h) => h !== "*").join("\n")
  )
  const list = hosts.split(/[\s,]+/).filter(Boolean)
  const next = mode === "any" ? ["*"] : mode === "list" ? list : []
  const changed = next.join() !== service.egress.join()
  const { busy, onSubmit } = useSubmit(async () => {
    if (mode === "list" && !list.length) {
      throw new Error("Add a host, or choose None.")
    }
    await runner.setLimits(service.name, { egress: next })
    toast("Egress saved; the service restarts with it")
    router.refresh()
  })
  return (
    <Section
      title="Egress"
      about={
        allowed ? (
          "Which hosts the service may call."
        ) : (
          <>
            Which hosts the service may call.{" "}
            <span className="text-warn">
              Outbound calls are off for the whole runner, in System.
            </span>
          </>
        )
      }
    >
      <form className="flex flex-col items-start gap-3" onSubmit={onSubmit}>
        <Segmented
          label="Outbound calls"
          value={mode}
          onChange={setMode}
          options={modes}
        />
        {mode === "list" && (
          <textarea
            rows={4}
            value={hosts}
            onChange={(e) => setHosts(e.target.value)}
            placeholder={"api.example.com\n*.github.com"}
            spellCheck={false}
            aria-label="Hosts, one per line"
            className="w-full max-w-md animate-in rounded-lg border bg-field p-3 font-mono text-xs duration-200 outline-none fade-in focus-visible:border-ring"
          />
        )}
        <Button variant="outline" size="sm" disabled={!changed || busy}>
          {busy ? "Saving" : "Save"}
        </Button>
      </form>
    </Section>
  )
}

function Disk({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const router = useRouter()
  const { busy, onSubmit } = useSubmit(async (f) => {
    await runner.setLimits(service.name, { disk_mb: Number(f.get("mb")) || 0 })
    toast("Quota saved")
    router.refresh()
  })
  return (
    <Section title="Disk" about="Its databases and files share a quota.">
      <div className="max-w-md">
        <Meter
          label="Used"
          used={formatBytes(service.bytes)}
          total={formatBytes(service.disk_quota)}
          ratio={service.disk_quota ? service.bytes / service.disk_quota : 0}
        />
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <label className="flex h-9 w-56 items-center rounded-lg border bg-field focus-within:border-ring">
          <input
            name="mb"
            type="number"
            min={0}
            max={1048576}
            defaultValue={service.disk_mb || ""}
            placeholder="runner default"
            aria-label="Quota in MB; empty for the runner's default"
            className="h-full min-w-0 flex-1 [appearance:textfield] bg-transparent pl-3 font-mono text-[13px] outline-none placeholder:text-faint [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="pr-3 font-mono text-xs text-muted-foreground">
            MB
          </span>
        </label>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? "Saving" : "Set quota"}
        </Button>
      </form>
    </Section>
  )
}

const namePattern = "[A-Za-z_][A-Za-z0-9_]*"

function Vars({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const router = useRouter()
  const { busy, onSubmit } = useSubmit(async (f, form) => {
    await runner.putVar(
      service.name,
      String(f.get("name")).trim(),
      String(f.get("value"))
    )
    form.reset()
    toast("Var saved; the service restarts with it")
    router.refresh()
  })
  return (
    <Section
      title="Vars"
      about="Plain settings the code reads from env. They override the ones it deploys with."
    >
      <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <Input
          name="name"
          placeholder="NAME"
          pattern={namePattern}
          required
          aria-label="Var name"
          className="w-48 font-mono"
        />
        <Input
          name="value"
          placeholder="value"
          autoComplete="off"
          aria-label="Var value"
          className="min-w-40 flex-1 font-mono"
        />
        <Button variant="outline" size="sm" disabled={busy}>
          Set
        </Button>
      </form>
      {service.vars.length > 0 && (
        <ul className="flex flex-col border-t">
          {service.vars.map((v) => (
            <li
              key={v.name}
              className="flex items-baseline gap-4 border-b border-rule py-2.5"
            >
              <span
                className="min-w-0 truncate font-mono text-[13px]"
                title={v.value}
              >
                {v.name}{" "}
                <span className="text-muted-foreground">= {v.value}</span>
              </span>
              <ActionButton
                variant="link"
                size="sm"
                className="ml-auto h-auto font-normal hover:text-destructive"
                run={async () => {
                  if (!(await confirm(`Delete the var ${v.name}?`))) return
                  await runner.deleteVar(service.name, v.name)
                  router.refresh()
                }}
              >
                Delete
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Secrets({
  service,
  secrets,
}: {
  service: ServiceDetail
  secrets: Secret[]
}) {
  const runner = useRunner()
  const router = useRouter()
  const { busy, onSubmit } = useSubmit(async (f, form) => {
    await runner.putSecret(
      service.name,
      String(f.get("name")).trim(),
      String(f.get("value"))
    )
    form.reset()
    toast("Secret saved; the service restarts with it")
    router.refresh()
  })
  return (
    <Section
      title="Secrets"
      about="Like vars, but kept encrypted and never shown again."
    >
      <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <Input
          name="name"
          placeholder="NAME"
          pattern={namePattern}
          required
          aria-label="Secret name"
          className="w-48 font-mono"
        />
        <Input
          name="value"
          type="password"
          placeholder="value"
          required
          autoComplete="off"
          aria-label="Secret value"
          className="min-w-40 flex-1"
        />
        <Button variant="outline" size="sm" disabled={busy}>
          Set
        </Button>
      </form>
      {secrets.length > 0 && (
        <ul className="flex flex-col border-t">
          {secrets.map((s) => (
            <li
              key={s.name}
              className="flex items-baseline gap-4 border-b border-rule py-2.5"
            >
              <span className="font-mono text-[13px]">{s.name}</span>
              <Mono className="ml-auto">set {relative(s.updated_at)}</Mono>
              <ActionButton
                variant="link"
                size="sm"
                className="h-auto font-normal hover:text-destructive"
                run={async () => {
                  if (!(await confirm(`Delete the secret ${s.name}?`))) return
                  await runner.deleteSecret(service.name, s.name)
                  router.refresh()
                }}
              >
                Delete
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Transfer({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const router = useRouter()
  return (
    <Section
      title="Data"
      about="Every database and file of the service, as one archive, to keep or to move."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <a href={runner.exportUrl(service.name)} download>
            Export
          </a>
        </Button>
        <FileButton
          accept=".gz,application/gzip"
          run={async ([file]) => {
            if (
              !(await confirm(
                `Import ${file!.name}? Each store in it replaces the service's store of the same name.`,
                "Import"
              ))
            )
              return
            const r = await runner.importData(service.name, file!)
            toast(`Imported ${plural(r.stores.length, "store")}`)
            router.refresh()
          }}
        >
          Import
        </FileButton>
      </div>
    </Section>
  )
}

function Danger({ service }: { service: ServiceDetail }) {
  const runner = useRunner()
  const router = useRouter()
  const root = usePanelRoot()
  return (
    <Section title="Danger zone" about="These can't be undone." danger>
      <div className="flex flex-col rounded-lg border border-destructive/35">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-medium">Delete all data</p>
            <p className="text-[13px] text-muted-foreground">
              Every database and file. The service keeps running.
            </p>
          </div>
          <ActionButton
            variant="destructive"
            pending="Deleting"
            run={async () => {
              if (!(await confirm(`Delete all data of ${service.name}?`)))
                return
              await runner.deleteStorage(service.name)
              toast(`${service.name}'s data deleted`)
              router.refresh()
            }}
          >
            Delete data
          </ActionButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-destructive/20 px-5 py-4">
          <div>
            <p className="font-medium">Delete this service</p>
            <p className="text-[13px] text-muted-foreground">
              Its URL, versions, secrets, logs, jobs and data, at once.
            </p>
          </div>
          <ActionButton
            variant="destructive"
            pending="Deleting"
            run={async () => {
              if (!(await confirm(`Delete ${service.name} and all its data?`)))
                return
              await runner.deleteService(service.name)
              toast(`${service.name} deleted`)
              window.scrollTo({ top: 0 })
              router.push(root || "/", {
                scroll: false,
                transitionTypes: ["nav-back"],
              })
            }}
          >
            Delete service
          </ActionButton>
        </div>
      </div>
    </Section>
  )
}
