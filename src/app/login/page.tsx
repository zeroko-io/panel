import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Kicker, Logo } from "@/components/ui/ledger"

import { publicUrl } from "@/lib/runner-server"
import { signedIn } from "@/lib/session"

import { SignInForm } from "./form"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage() {
  if (await signedIn()) redirect("/")
  const host = new URL(await publicUrl()).host
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_520px]">
      <div className="hidden flex-col border-r p-14 lg:flex">
        <Logo />
        <div className="mt-auto flex max-w-[560px] flex-col gap-5">
          <Kicker>Self-hosted runner</Kicker>
          <p className="font-serif text-[46px] leading-[1.1] tracking-[-0.015em]">
            Small services, deployed by your agents,{" "}
            <span className="text-muted-foreground italic">
              kept on your machine.
            </span>
          </p>
        </div>
        <div className="mt-14 flex gap-8 font-mono text-xs text-faint">
          <span>Zeroko Panel</span>
          <span>MIT - AGPL</span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-7 p-6 sm:p-14">
        <Logo className="lg:hidden" />
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-normal">Sign in</h1>
          <span className="text-muted-foreground">{host}</span>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
