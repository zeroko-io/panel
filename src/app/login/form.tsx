"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { signIn } from "@/lib/actions"

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, {})
  return (
    <form action={action} className="flex flex-col gap-7">
      <label className="flex flex-col gap-2">
        <span className="kicker">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
          className="h-10 font-mono"
        />
        {state.error && (
          <span className="text-[13px] text-destructive">{state.error}</span>
        )}
      </label>
      <Button size="lg" disabled={pending}>
        {pending ? "Signing in" : "Continue"}
      </Button>
      <p className="text-[13px] leading-normal text-faint">
        The admin password set when the panel was installed.
      </p>
    </form>
  )
}
