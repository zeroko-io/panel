import type { Metadata } from "next"
import { ServiceOverview } from "@/screens/service"

import { runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export async function generateMetadata(
  props: PageProps<"/services/[name]">
): Promise<Metadata> {
  return { title: decodeURIComponent((await props.params).name) }
}

export default async function ServiceOverviewPage(
  props: PageProps<"/services/[name]">
) {
  await requireSession()
  const name = decodeURIComponent((await props.params).name)
  return <ServiceOverview runner={runner()} root="" name={name} />
}
