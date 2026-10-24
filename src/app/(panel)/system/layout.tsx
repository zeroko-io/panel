import { ArrowUpRight } from "lucide-react"
import { PageHeader } from "@/components/ui/ledger"

import { Page } from "@/components/ui/page"
import { SubTabs } from "@/components/ui/navigation"
import { loadSettings, loadSystem } from "@/lib/runner-server"
import { updates } from "@/lib/updates"
import { requireSession } from "@/lib/session"

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSession()
  const [settings, system] = await Promise.all([loadSettings(), loadSystem()])
  const news = await updates(system.version)
  return (
    <Page>
      <PageHeader
        title="System"
        note={
          <span className="font-mono text-xs not-italic">
            {settings.domain || "no domain yet"}
          </span>
        }
      />
      {news.map((u) => (
        <div
          key={u.name}
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-l border-brand py-1 pl-[18px]"
        >
          <span className="kicker text-brand">Update</span>
          <span>
            {u.name} {u.version} is out; this one runs {u.current}.
          </span>
          <a
            href={u.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            What&apos;s new <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </div>
      ))}
      <SubTabs
        base="/system"
        group="system"
        tabs={[
          ["", "Overview"],
          ["logs", "Logs"],
          ["backups", "Backups"],
        ]}
      />
      {children}
    </Page>
  )
}
