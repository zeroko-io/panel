"use client"

import { ActionButton } from "@/components/ui/action"
import { toast } from "@/components/ui/feedback"

import { useRunner } from "@/components/ui/runner"

/** Queues a cron's job now. */
export function RunCron({
  service,
  schedule,
}: {
  service: string
  schedule: string
}) {
  const runner = useRunner()
  return (
    <ActionButton
      variant="link"
      size="sm"
      className="h-auto font-mono text-[11px] font-normal text-brand"
      pending="queuing"
      run={async () => {
        await runner.runCron(service, schedule)
        toast(`Queued the job of ${schedule}`)
      }}
    >
      run now
    </ActionButton>
  )
}
