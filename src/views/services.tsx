"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/feedback"
import { Input } from "@/components/ui/input"
import { Mono, Table, Td, Th, Tr } from "@/components/ui/ledger"
import { formatNumber, relative } from "@/lib/format"
import type { Service } from "@/lib/runner"

import { TopLink } from "@/components/ui/navigation"
import { ServiceName } from "@/components/ui/page"
import { ServiceStatus } from "@/views/service-status"
import { usePanelRoot, useRunner } from "@/components/ui/runner"

/** The services, with how many requests each answered in a day. */
export function ServicesTable({
  services,
  requests,
}: {
  services: Service[]
  requests: Record<string, number>
}) {
  const root = usePanelRoot()
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = services.filter(
    (s) => !q || s.name.includes(q) || s.id.includes(q)
  )
  return (
    <div className="flex flex-col gap-4">
      {services.length > 5 && (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services"
          aria-label="Search services"
          className="max-w-sm"
        />
      )}
      {shown.length === 0 ? (
        <p className="py-6 font-serif text-muted-foreground italic">
          No services match “{query}”.
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-[240px]">Name</Th>
              <Th className="max-md:hidden">URL</Th>
              <Th className="w-[150px]">Status</Th>
              <Th className="w-[110px] text-right max-sm:hidden">Requests</Th>
              <Th className="w-[140px] text-right">Version</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <Tr key={s.id} className="group relative">
                <Td>
                  <TopLink
                    href={`${root}/services/${encodeURIComponent(s.name)}`}
                    transitionTypes={["nav-forward"]}
                    className="font-medium underline-offset-4 group-hover:underline after:absolute after:inset-0"
                  >
                    <ServiceName id={s.id}>{s.name}</ServiceName>
                  </TopLink>
                  {s.latest?.status === "failed" && (
                    <span className="ml-3 font-mono text-[11px] text-destructive">
                      last deploy failed
                    </span>
                  )}
                </Td>
                <Td className="max-md:hidden">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative z-10"
                    >
                      <Mono className="hover:text-foreground">
                        {s.url.replace(/^https?:\/\//, "")}
                      </Mono>
                    </a>
                  ) : (
                    <Mono>Set a domain in System</Mono>
                  )}
                </Td>
                <Td>
                  <ServiceStatus status={s.status} />
                </Td>
                <Td className="text-right max-sm:hidden">
                  <Mono
                    className={requests[s.id] ? "text-foreground" : undefined}
                  >
                    {formatNumber(requests[s.id] ?? 0)}
                  </Mono>
                </Td>
                <Td className="text-right">
                  <Mono>
                    {s.version ? `v${s.version}` : "never deployed"}
                    {s.version &&
                      s.latest &&
                      ` - ${relative(s.latest.created_at)}`}
                  </Mono>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

/** Creates an empty service, for an agent or a deploy to fill. */
/** `domain` is what follows a service's name in its host, separator
 * included. */
export function NewService({ domain }: { domain: string }) {
  const runner = useRunner()
  const root = usePanelRoot()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!open) {
    return <Button onClick={() => setOpen(true)}>New service</Button>
  }
  return (
    <form
      className="flex animate-in flex-wrap items-center gap-2 duration-200 fade-in slide-in-from-right-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const name = String(new FormData(e.currentTarget).get("name") ?? "")
          .trim()
          .toLowerCase()
        setBusy(true)
        try {
          const s = await runner.createService(name)
          toast(`${s.name} created`)
          window.scrollTo({ top: 0 })
          router.push(`${root}/services/${encodeURIComponent(s.name)}`, {
            scroll: false,
            transitionTypes: ["nav-forward"],
          })
        } catch (err) {
          toast(err, true)
          setBusy(false)
        }
      }}
    >
      <label className="flex h-[34px] items-center rounded-lg border bg-field focus-within:border-ring">
        <input
          name="name"
          autoFocus
          placeholder="name"
          aria-label="Service name; empty for a random one"
          pattern="[a-zA-Z0-9\-]*"
          maxLength={40}
          className="h-full w-40 bg-transparent pl-3 text-right font-mono text-[13px] outline-none placeholder:text-faint"
        />
        <span className="pr-3 font-mono text-[13px] text-muted-foreground">
          {domain || ".domain"}
        </span>
      </label>
      <Button disabled={busy}>{busy ? "Creating" : "Create"}</Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  )
}
