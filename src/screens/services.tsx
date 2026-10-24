// The services of a runner, as a page of a panel. Server component: the
// panel passes its runner (with its token) and where its pages start.
import { AutoRefresh } from "@/components/ui/auto-refresh"
import { PageHeader, Stat, Stats } from "@/components/ui/ledger"
import { TopLink } from "@/components/ui/navigation"
import { Page } from "@/components/ui/page"
import { bytesParts, formatNumber } from "@/lib/format"
import { loadSettings, loadSystem } from "@/lib/load"
import type { Runner } from "@/lib/runner"
import { NewService, ServicesTable } from "@/views/services"

function summary(n: number, running: number): string {
  if (n === 0) return "Nothing deployed yet."
  const of = n === 1 ? "One service" : `${formatNumber(n)} services`
  if (running === n)
    return n === 1 ? "One service, running." : `${of}, all running.`
  if (running === 0) return `${of}, none running.`
  return `${of}, ${formatNumber(running)} running.`
}

export async function ServicesScreen({
  runner: r,
  root,
  skill,
  kicker,
  actions,
}: {
  runner: Runner
  root: string
  /** The skill's address, for the first steps. */
  skill: string
  /** A line over the title, as the team a panel shows. */
  kicker?: React.ReactNode
  /** The panel's own buttons, before New service. */
  actions?: React.ReactNode
}) {
  const [services, system, settings] = await Promise.all([
    r.services("24h"),
    loadSystem(r),
    loadSettings(r),
  ])
  // One call for every service's traffic; a runner too old for it gets
  // asked service by service.
  const traffic = services.every((s) => s.traffic)
    ? services.map((s) => s.traffic)
    : await Promise.all(
        services.map((s) =>
          r.metrics(s.name).then(
            (m) => m.totals,
            () => undefined
          )
        )
      )
  const requests = Object.fromEntries(
    services.map((s, i) => [s.id, traffic[i]?.requests ?? 0])
  )
  const total = traffic.reduce((n, t) => n + (t?.requests ?? 0), 0)
  const errors = traffic.reduce((n, t) => n + (t?.errors ?? 0), 0)
  const [disk, diskUnit] = bytesParts(system.data_bytes)
  const running = services.filter((s) => s.status === "running").length

  return (
    <Page>
      <AutoRefresh />
      <PageHeader
        kicker={kicker}
        title="Services"
        note={summary(services.length, running)}
        actions={
          <>
            {actions}
            <NewService
              domain={
                settings.domain &&
                `${settings.separator ?? "."}${settings.domain}`
              }
            />
          </>
        }
      />
      <Stats>
        <Stat label="Requests - 24h" value={formatNumber(total)} />
        <Stat
          label="Error rate"
          value={total ? ((errors / total) * 100).toFixed(1) : "0"}
          unit="%"
        />
        <Stat
          label="Processes"
          value={system.processes.length}
          unit={`/ ${settings.max_processes}`}
        />
        <Stat label="Data" value={disk} unit={diskUnit} />
      </Stats>
      {services.length === 0 ? (
        <div className="flex animate-in flex-col gap-3 border-l border-brand py-1 pl-5 duration-500 fade-in slide-in-from-bottom-1">
          <p className="font-serif text-xl">Give your agent the skill.</p>
          <p className="max-w-[560px] leading-relaxed text-muted-foreground">
            Make a token in{" "}
            <TopLink
              href={`${root}/tokens`}
              className="text-foreground underline"
            >
              Tokens
            </TopLink>
            , point Claude or any agent at{" "}
            <span className="font-mono text-foreground">{skill}</span>, and ask
            it for a service. It shows up here.
          </p>
        </div>
      ) : (
        <ServicesTable services={services} requests={requests} />
      )}
    </Page>
  )
}
