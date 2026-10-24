// A service, as pages of a panel: the frame around its tabs, and each tab.
// Server components: the panel passes its runner (with its token), where its
// pages start, and the service's name.
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Indicator } from "@/components/ui/action"
import { AutoRefresh } from "@/components/ui/auto-refresh"
import { RequestChart } from "@/components/ui/chart"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Fact,
  Facts,
  Kicker,
  LogLines,
  type LogTone,
  Meter,
  Mono,
  PageHeader,
  SectionTitle,
  Stat,
  Stats,
} from "@/components/ui/ledger"
import { SubTabs, TopLink } from "@/components/ui/navigation"
import { Page, ServiceName } from "@/components/ui/page"
import {
  bytesParts,
  clock,
  day,
  duration,
  formatBytes,
  formatNumber,
  latency,
  rate,
  relative,
  renderTime,
} from "@/lib/format"
import { loadService, loadSettings } from "@/lib/load"
import {
  type LogEntry,
  type Period,
  type Runner,
  RunnerError,
} from "@/lib/runner"
import { cn } from "@/lib/utils"
import { DataExplorer } from "@/views/service/data"
import { ServiceActions } from "@/views/service/header"
import { ServiceLogs } from "@/views/service/logs"
import { RunCron } from "@/views/service/overview"
import { ServiceSettings } from "@/views/service/settings"
import { Versions } from "@/views/service/versions"
import { ServiceStatus } from "@/views/service-status"

type Props = { runner: Runner; root: string; name: string }

const pathOf = (root: string, name: string) =>
  `${root}/services/${encodeURIComponent(name)}`

/** The frame of a service's pages: its name, status, address, actions and
 * tabs. A service the runner doesn't have is a 404. */
export async function ServiceFrame({
  runner: r,
  root,
  name,
  children,
}: Props & { children: React.ReactNode }) {
  const service = await loadService(r, name).catch((err) => {
    if (err instanceof RunnerError && err.status === 404) notFound()
    throw err
  })
  return (
    <Page>
      <AutoRefresh />
      <Kicker>
        <TopLink
          href={root || "/"}
          transitionTypes={["nav-back"]}
          className="hover:text-foreground"
        >
          Services
        </TopLink>{" "}
        / <span className="text-foreground">{service.name}</span>
      </Kicker>
      <PageHeader
        shared={false}
        title={<ServiceName id={service.id}>{service.name}</ServiceName>}
        note={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm not-italic">
            <ServiceStatus status={service.status} />
            {service.url && (
              <span className="flex items-center gap-1">
                <a
                  href={service.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs hover:text-foreground"
                >
                  {service.url.replace(/^https?:\/\//, "")}
                </a>
                <CopyButton
                  text={service.url}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 font-mono text-[11px] font-normal"
                >
                  copy
                </CopyButton>
              </span>
            )}
          </span>
        }
        actions={<ServiceActions service={service} />}
      />
      <SubTabs
        base={pathOf(root, service.name)}
        group="service"
        tabs={[
          ["", "Overview"],
          ["traffic", "Traffic"],
          ["versions", "Versions"],
          ["logs", "Logs"],
          ["data", "Data"],
          ["settings", "Settings"],
        ]}
      />
      {children}
    </Page>
  )
}

const sourceTone: Record<LogEntry["source"], LogTone> = {
  request: "info",
  console: "idle",
  fetch: "idle",
  runtime: "brand",
}

function egressSummary(hosts: string[]): string {
  if (hosts.includes("*")) return "any public host"
  return hosts.length ? hosts.join(", ") : "none"
}

export async function ServiceOverview({ runner: r, root, name }: Props) {
  const [service, logs] = await Promise.all([
    loadService(r, name),
    r.logs(name, { limit: 12 }),
  ])
  const d = service.deployment
  const m = service.manifest
  const p = service.process
  const [stored, storedUnit] = bytesParts(service.bytes)
  const [memory, memoryUnit] = bytesParts(p?.memory ?? 0)
  // The service's own vars over the version's.
  const vars = Object.entries({
    ...m?.vars,
    ...Object.fromEntries(service.vars.map((v) => [v.name, v.value])),
  }).sort(([a], [b]) => a.localeCompare(b))
  const lines = logs.reverse().map((l) => ({
    id: l.id,
    time: clock(l.ts),
    kind: l.level === "error" ? "error" : l.source,
    tone: l.level === "error" ? ("error" as const) : sourceTone[l.source],
    message: l.message,
  }))

  return (
    <Page>
      <Stats className="md:grid-cols-5">
        <Stat
          label="Live version"
          value={d ? `v${d.number}` : "none"}
          unit={d ? relative(d.created_at) : undefined}
        />
        <Stat
          label="Memory"
          value={p ? memory : service.stopped ? "stopped" : "idle"}
          unit={p ? memoryUnit : undefined}
        />
        <Stat label="Storage" value={stored} unit={storedUnit} />
        <Stat
          label="Jobs"
          value={service.jobs.queued + service.jobs.running}
          unit={service.jobs.dead ? `${service.jobs.dead} dead` : undefined}
        />
        <Stat label="Connections" value={service.connections} unit="live" />
      </Stats>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="flex flex-col gap-3">
            <SectionTitle>Bindings</SectionTitle>
            {service.bindings.length === 0 ? (
              <p className="text-muted-foreground">
                {d
                  ? "This version declares no bindings."
                  : "Nothing deployed yet."}
              </p>
            ) : (
              <ul className="flex flex-col border-t">
                {service.bindings.map((b) => (
                  <li
                    key={b.name}
                    className="flex items-baseline gap-5 border-b border-rule py-2.5"
                  >
                    <Mono className="w-20 shrink-0 text-brand">
                      {b.type.startsWith("service:") ? "service" : b.type}
                    </Mono>
                    <span className="font-mono text-[13px]">{b.name}</span>
                    <Mono className="ml-auto">
                      {b.type.startsWith("service:")
                        ? `calls ${b.type.slice(8)}`
                        : b.type === "files"
                          ? `${b.count ?? 0} files - ${formatBytes(b.bytes ?? 0)}`
                          : b.type === "db"
                            ? formatBytes(b.bytes ?? 0)
                            : ""}
                    </Mono>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <SectionTitle>Recent logs</SectionTitle>
              <TopLink
                href={`${pathOf(root, service.name)}/logs`}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Tail the log <ArrowRight aria-hidden className="size-3" />
              </TopLink>
            </div>
            <LogLines lines={lines} />
          </section>
        </div>

        <Facts>
          <Meter
            label="Disk"
            used={formatBytes(service.bytes)}
            total={formatBytes(service.disk_quota)}
            ratio={service.disk_quota ? service.bytes / service.disk_quota : 0}
          />
          <Fact label="Crons">
            {m?.crons?.length ? (
              <span className="flex flex-col gap-1">
                {m.crons.map((c) => (
                  <span key={c.schedule} className="flex items-center gap-3">
                    {c.schedule}
                    {!service.stopped && (
                      <RunCron service={service.name} schedule={c.schedule} />
                    )}
                  </span>
                ))}
              </span>
            ) : (
              "none"
            )}
          </Fact>
          {vars.length > 0 && (
            <Fact label="Vars">
              <span className="flex flex-col gap-0.5">
                {vars.map(([k, v]) => (
                  <span key={k} className="truncate" title={v}>
                    {k} <span className="text-muted-foreground">= {v}</span>
                  </span>
                ))}
              </span>
            </Fact>
          )}
          <Fact label="Egress">{egressSummary(service.egress)}</Fact>
          {p && (
            <Fact label="Up for">{duration(renderTime() - p.started)}</Fact>
          )}
          <Fact label="Created">{day(service.created_at)}</Fact>
          <Fact label="ID">
            <span className="flex items-center gap-1">
              {service.id}
              <CopyButton
                text={service.id}
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 font-mono text-[11px] font-normal"
              >
                copy
              </CopyButton>
            </span>
          </Fact>
        </Facts>
      </div>
    </Page>
  )
}

const periods: Period[] = ["1h", "24h", "7d", "30d"]

export async function ServiceTraffic({
  runner: r,
  root,
  name,
  period: asked,
}: Props & { period?: string | string[] }) {
  const period = periods.find((p) => p === asked) ?? "24h"
  const data = await r.metrics(name, period)
  const t = data.totals
  const base = `${pathOf(root, name)}/traffic`
  return (
    <Page>
      <div className="flex items-center justify-end">
        <nav
          aria-label="Period"
          className="relative inline-flex rounded-lg border p-0.5 font-mono text-[11px] tracking-[0.06em] uppercase"
        >
          <Indicator />
          {periods.map((p) => (
            <TopLink
              key={p}
              href={`${base}?period=${p}`}
              scroll={false}
              aria-current={p === period ? "page" : undefined}
              className={cn(
                "relative inline-flex h-6 items-center rounded-sm px-2.5 transition-colors",
                p === period
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">{p}</span>
            </TopLink>
          ))}
        </nav>
      </div>
      <Stats className="md:grid-cols-5">
        <Stat label="Requests" value={formatNumber(t.requests)} />
        <Stat
          label="5xx errors"
          value={formatNumber(t.errors)}
          unit={t.requests ? rate(t.errors, t.requests) : undefined}
        />
        <Stat label="Exceptions" value={formatNumber(t.exceptions)} />
        <Stat
          label="Duration p95"
          value={latency(t.p95)}
          unit={t.requests ? `p50 ${latency(t.p50)}` : undefined}
        />
        <Stat
          label="Outbound"
          value={formatNumber(t.outbound)}
          unit={
            t.outbound_errors
              ? `${formatNumber(t.outbound_errors)} failed`
              : undefined
          }
        />
      </Stats>
      {t.requests > 0 ? (
        <RequestChart key={period} data={data} />
      ) : (
        <p className="py-10 text-center font-serif text-muted-foreground italic">
          No requests in this period.
        </p>
      )}
    </Page>
  )
}

export async function ServiceVersions({ runner: r, name }: Props) {
  const [service, deployments] = await Promise.all([
    loadService(r, name),
    r.deployments(name),
  ])
  return (
    <Page>
      <Versions service={service} deployments={deployments} />
    </Page>
  )
}

export function ServiceLogsScreen({ name }: { name: string }) {
  return (
    <Page>
      <ServiceLogs key={name} name={name} />
    </Page>
  )
}

export async function ServiceData({ runner: r, name }: Props) {
  const [service, stores] = await Promise.all([
    loadService(r, name),
    r.storage(name),
  ])
  return (
    <Page>
      <DataExplorer service={service} stores={stores} />
    </Page>
  )
}

export async function ServiceSettingsScreen({ runner: r, name }: Props) {
  const [service, secrets, settings] = await Promise.all([
    loadService(r, name),
    r.secrets(name),
    loadSettings(r),
  ])
  return (
    <Page>
      <ServiceSettings
        service={service}
        secrets={secrets}
        egressAllowed={settings.egress}
      />
    </Page>
  )
}
