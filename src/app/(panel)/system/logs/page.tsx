import type { Metadata } from "next"

import { Page } from "@/components/ui/page"
import { SystemLogs } from "@/components/system"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Runner logs" }

export default async function SystemLogsPage() {
  await requireSession()
  return (
    <Page>
      <SystemLogs />
    </Page>
  )
}
