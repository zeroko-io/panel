import type { Metadata } from "next"
import { TokensScreen } from "@/screens/tokens"

import { publicUrl, runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Tokens" }

export default async function TokensPage() {
  await requireSession()
  return (
    <TokensScreen runner={runner()} skill={`${await publicUrl()}/skill.md`} />
  )
}
