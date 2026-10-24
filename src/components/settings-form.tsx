"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { confirm, toast } from "@/components/ui/feedback"
import { Input, Select } from "@/components/ui/input"
import { FieldRow } from "@/components/ui/ledger"
import type { Settings } from "@/lib/runner"

import { useRunner } from "@/components/ui/runner"

function NumberField({
  name,
  label,
  hint,
  unit,
  value,
}: {
  name: keyof Settings
  label: string
  hint: string
  unit: string
  value: number
}) {
  return (
    <FieldRow label={label} hint={hint} htmlFor={name}>
      <Input
        id={name}
        name={name}
        type="number"
        min={1}
        required
        defaultValue={value}
        className="font-mono"
      />
      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
        {unit}
      </span>
    </FieldRow>
  )
}

/** The runner's settings. Saving restarts it in place, so the form waits
 * for it to come back before drawing the page again. */
export function SettingsForm({ settings: s }: { settings: Settings }) {
  const runner = useRunner()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const n = (k: string) => Number(f.get(k))
        if (
          !(await confirm(
            "Save and restart the runner? Services start again on their next request, and realtime connections close.",
            "Save and restart",
            { danger: false }
          ))
        )
          return
        setBusy(true)
        try {
          await runner.setSettings({
            domain: String(f.get("domain") ?? "").trim(),
            separator: String(f.get("separator")) === "--" ? "--" : ".",
            public_scheme: String(f.get("public_scheme")),
            max_body_mb: n("max_body_mb"),
            heap_mb: n("heap_mb"),
            cpu_seconds: n("cpu_seconds"),
            idle_seconds: n("idle_seconds"),
            max_processes: n("max_processes"),
            disk_mb: n("disk_mb"),
            egress: f.get("egress") === "on",
          })
          if (await runner.back()) toast("Saved. The runner restarted.")
          else toast("Saved, but the runner hasn't come back yet.", true)
          router.refresh()
        } catch (err) {
          toast(err, true)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="flex flex-col border-t">
        <FieldRow
          label="Domain"
          hint="Services answer at name.domain. Point a wildcard record here."
          htmlFor="domain"
        >
          <Input
            id="domain"
            name="domain"
            defaultValue={s.domain}
            placeholder="example.com"
            className="font-mono"
          />
        </FieldRow>
        <FieldRow
          label="Hosts"
          hint="name.domain, or name--domain: one level under a parent's wildcard certificate."
          htmlFor="separator"
        >
          <Select
            id="separator"
            name="separator"
            defaultValue={s.separator ?? "."}
            className="font-mono"
          >
            <option value=".">name.domain</option>
            <option value="--">name--domain</option>
          </Select>
        </FieldRow>
        <FieldRow
          label="Public scheme"
          hint="How service URLs start: behind a TLS proxy, https."
          htmlFor="public_scheme"
        >
          <Select
            id="public_scheme"
            name="public_scheme"
            defaultValue={s.public_scheme}
            className="font-mono"
          >
            <option value="https">https</option>
            <option value="http">http</option>
          </Select>
        </FieldRow>
        <NumberField
          name="heap_mb"
          label="Memory per service"
          hint="Heap for each service's process."
          unit="MB"
          value={s.heap_mb}
        />
        <NumberField
          name="cpu_seconds"
          label="CPU per request"
          hint="Busy time before the process restarts."
          unit="s"
          value={s.cpu_seconds}
        />
        <NumberField
          name="idle_seconds"
          label="Idle timeout"
          hint="A process with no work stops after this."
          unit="s"
          value={s.idle_seconds}
        />
        <NumberField
          name="max_processes"
          label="Processes"
          hint="Services running at once; the idlest stops first."
          unit=""
          value={s.max_processes}
        />
        <NumberField
          name="disk_mb"
          label="Disk per service"
          hint="Default quota for databases and files."
          unit="MB"
          value={s.disk_mb}
        />
        <NumberField
          name="max_body_mb"
          label="Request body"
          hint="Largest body a service accepts."
          unit="MB"
          value={s.max_body_mb}
        />
        <FieldRow
          label="Outbound network"
          hint="Lets services call the internet, within each one's egress."
          htmlFor="egress"
        >
          <label className="flex items-center gap-2.5">
            <input
              id="egress"
              name="egress"
              type="checkbox"
              defaultChecked={s.egress}
              className="size-4 accent-brand"
            />
            <span className="text-[13px]">Allowed</span>
          </label>
        </FieldRow>
      </div>
      <div>
        <Button disabled={busy}>
          {busy ? "Restarting" : "Save and restart"}
        </Button>
      </div>
    </form>
  )
}
