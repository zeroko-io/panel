"use client"

import { useState } from "react"
import { FileButton } from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { confirm, toast } from "@/components/ui/feedback"
import { SectionTitle } from "@/components/ui/ledger"
import { LogView } from "@/components/ui/log-view"

import { useRunner } from "@/components/ui/runner"

const levels = [
  ["info", "Info"],
  ["warn", "Warn"],
  ["error", "Error"],
] as const

/** Reads one line of the runner's log: key=value pairs, values bare or
 * quoted the way Go quotes them. */
function parseLogfmt(line: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of line.matchAll(/(\w+)=("(?:[^"\\]|\\.)*"|\S*)/g)) {
    let v = m[2]!
    if (v.startsWith('"')) {
      try {
        v = JSON.parse(v)
      } catch {
        v = v.slice(1, -1)
      }
    }
    out[m[1]!] = v
  }
  return out
}

/** The runner's own log, polled every two seconds. */
export function SystemLogs() {
  const runner = useRunner()
  return (
    <LogView
      levels={levels}
      empty="No runner logs yet."
      delay={2000}
      load={async (after) => {
        const lines = await runner.systemLogs(after)
        return lines.map((l) => {
          const { time: _, level, msg, ...rest } = parseLogfmt(l.message)
          const attrs = Object.entries(rest)
            .map(([k, v]) => `${k}=${v}`)
            .join(" ")
          return {
            id: l.seq,
            ts: l.ts,
            level: (level ?? "info").toLowerCase(),
            text: `${msg ?? l.message}${attrs ? `  ${attrs}` : ""}`,
          }
        })
      }}
    />
  )
}

/** Downloads everything the runner holds, and restores a download. */
export function Backups() {
  const runner = useRunner()
  const [restoring, setRestoring] = useState(false)
  return (
    <div className="flex flex-col">
      <section className="grid gap-4 border-b border-rule py-8 first:pt-2 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
        <div className="flex flex-col gap-1.5">
          <SectionTitle>Back up</SectionTitle>
          <p className="text-[13px] leading-snug text-muted-foreground">
            Every service, version, secret, log and file, while the runner runs.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-lg text-[13px] text-muted-foreground">
            The archive holds the key to the secrets: keep it as safe as the
            server.
          </p>
          <Button asChild>
            <a href={runner.backupUrl()} download>
              Download a backup
            </a>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 py-8 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
        <div className="flex flex-col gap-1.5">
          <SectionTitle className="text-destructive">Restore</SectionTitle>
          <p className="text-[13px] leading-snug text-muted-foreground">
            Replaces all of the runner&apos;s data with a backup&apos;s, and
            restarts it.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <FileButton
            accept=".gz,application/gzip"
            variant="destructive"
            run={async ([file]) => {
              if (
                !(await confirm(
                  `Restore ${file!.name}? Everything the runner holds now is replaced by the backup.`,
                  "Restore"
                ))
              )
                return
              await runner.restore(file!)
              setRestoring(true)
              await runner.back(120_000)
              toast("Backup restored")
              window.location.replace(window.location.origin)
            }}
          >
            Restore a backup
          </FileButton>
        </div>
      </section>
      {restoring && (
        <div
          role="status"
          className="fixed inset-0 z-50 grid animate-in place-items-center bg-background/85 backdrop-blur-sm duration-300 fade-in"
        >
          <p className="flex items-center gap-3 font-serif text-lg">
            <span aria-hidden className="size-2 animate-breathe bg-brand" />
            Restoring and restarting the runner
          </p>
        </div>
      )}
    </div>
  )
}
