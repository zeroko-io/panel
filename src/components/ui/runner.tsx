"use client"

// The runner as the browser reaches it, for the shared views: each panel
// says where (through /runner-api, with the admin's session), and where its
// pages of that runner live (at /).
import * as React from "react"

import { Runner } from "@/lib/runner"

const RunnerContext = React.createContext<Runner | null>(null)
const RootContext = React.createContext("")

function RunnerProvider({
  base,
  root = "",
  children,
}: {
  base: string
  /** The path the panel's pages of this runner start at, without a
   * trailing slash: "" here. */
  root?: string
  children: React.ReactNode
}) {
  const runner = React.useMemo(() => new Runner(base), [base])
  return (
    <RunnerContext value={runner}>
      <RootContext value={root}>{children}</RootContext>
    </RunnerContext>
  )
}

function useRunner(): Runner {
  const runner = React.use(RunnerContext)
  if (!runner) throw new Error("useRunner needs a RunnerProvider above it.")
  return runner
}

/** Where the panel's pages of the runner start: a service is at
 * `${root}/services/<name>`, the list at `root || "/"`. */
function usePanelRoot(): string {
  return React.use(RootContext)
}

export { RunnerProvider, usePanelRoot, useRunner }
