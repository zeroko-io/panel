"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ActionButton } from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { confirm, toast } from "@/components/ui/feedback"
import { Input, Select } from "@/components/ui/input"

import { useRunner } from "@/components/ui/runner"

export function CreateToken({ skill }: { skill: string }) {
  const runner = useRunner()
  const router = useRouter()
  const [secret, setSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (secret) {
    const prompt = `Read ${skill} and use the Zeroko API with:\nAuthorization: Bearer ${secret}`
    return (
      <div className="flex animate-in flex-col gap-4 rounded-lg border border-ok/40 bg-card p-5 duration-300 fade-in slide-in-from-top-1">
        <p className="text-[13px] leading-snug text-muted-foreground">
          Copy it now: the runner keeps only its hash, so it won&apos;t be shown
          again.
        </p>
        <div className="flex items-center gap-1 rounded-lg border bg-field py-1 pr-1 pl-3">
          <code className="flex-1 font-mono text-xs break-all">{secret}</code>
          <CopyButton size="sm" variant="ghost" text={secret}>
            Copy
          </CopyButton>
        </div>
        <div className="flex flex-col gap-2">
          <span className="kicker">Or give your agent this</span>
          <pre className="rounded-lg border bg-field p-3 font-mono text-xs wrap-anywhere whitespace-pre-wrap text-muted-foreground">
            {prompt}
          </pre>
          <div className="flex gap-2">
            <CopyButton size="sm" text={prompt}>
              Copy the prompt
            </CopyButton>
            <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const f = new FormData(form)
        setBusy(true)
        try {
          const r = await runner.createToken(
            String(f.get("name") ?? "").trim(),
            Number(f.get("expires") ?? 0)
          )
          form.reset()
          setSecret(r.secret)
          router.refresh()
        } catch (err) {
          toast(err, true)
        } finally {
          setBusy(false)
        }
      }}
    >
      <Input
        name="name"
        required
        maxLength={100}
        placeholder="Name, e.g. claude on my laptop"
        aria-label="Token name"
        className="min-w-56 flex-1"
      />
      <Select
        name="expires"
        defaultValue="90"
        aria-label="Expires"
        className="w-40"
      >
        <option value="7">Expires in 7 days</option>
        <option value="30">Expires in 30 days</option>
        <option value="90">Expires in 90 days</option>
        <option value="365">Expires in a year</option>
        <option value="0">Never expires</option>
      </Select>
      <Button disabled={busy}>{busy ? "Creating" : "Create token"}</Button>
    </form>
  )
}

export function RevokeToken({ id, name }: { id: string; name: string }) {
  const runner = useRunner()
  const router = useRouter()
  return (
    <ActionButton
      variant="link"
      size="sm"
      className="h-auto font-normal hover:text-destructive"
      pending="Revoking"
      run={async () => {
        if (
          !(await confirm(
            `Revoke “${name}”? Agents using it stop working.`,
            "Revoke"
          ))
        )
          return
        await runner.deleteToken(id)
        toast(`${name} revoked`)
        router.refresh()
      }}
    >
      Revoke
    </ActionButton>
  )
}
