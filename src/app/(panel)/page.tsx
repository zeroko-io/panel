import type { Metadata } from "next"
import { ServicesScreen } from "@/screens/services"

import { publicUrl, runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Services" }

export default async function ServicesPage() {
  await requireSession()
  return (
    <ServicesScreen
      runner={runner()}
      root=""
      skill={`${await publicUrl()}/skill.md`}
    />
  )
}
