"use client"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/ledger"

export default function PanelError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <PageHeader
      title="Something went wrong"
      note="The runner may have restarted, or refused the request. The panel's log has the details."
      actions={<Button onClick={reset}>Try again</Button>}
    />
  )
}
