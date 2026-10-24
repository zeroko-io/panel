import type { Metadata } from "next"
import { SectionTitle, Stat, Stats } from "@/components/ui/ledger"
import { bytesParts, duration, renderTime } from "@/lib/format"
import { AutoRefresh } from "@/components/ui/auto-refresh"
import { Page } from "@/components/ui/page"
import { SettingsForm } from "@/components/settings-form"
import { loadSettings, loadSystem } from "@/lib/runner-server"
import { panelVersion } from "@/lib/updates"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "System" }

export default async function SystemPage() {
  await requireSession()
  const [system, settings] = await Promise.all([loadSystem(), loadSettings()])
  const [data, dataUnit] = bytesParts(system.data_bytes)
  const [free, freeUnit] = bytesParts(system.disk.free)
  return (
    <Page>
      <AutoRefresh every={10000} />
      <div className="flex flex-col">
        <Stats>
          <Stat
            label="Uptime"
            value={duration(renderTime() - system.started)}
          />
          <Stat label="Services" value={system.services} />
          <Stat
            label="Processes"
            value={system.processes.length}
            unit={`/ ${settings.max_processes}`}
          />
          <Stat label="Service data" value={data} unit={dataUnit} />
        </Stats>
        <Stats className="border-t-0">
          <Stat label="Disk free" value={free} unit={freeUnit} />
          <Stat label="Panel" value={panelVersion} />
          <Stat label="Runner" value={system.version} />
          <Stat label="workerd" value={system.workerd || "unknown"} />
        </Stats>
      </div>
      <section className="flex flex-col gap-4">
        <SectionTitle>Settings</SectionTitle>
        <SettingsForm settings={settings} />
      </section>
    </Page>
  )
}
