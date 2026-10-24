import type { Metadata } from "next"
import { ServiceTraffic } from "@/screens/service"

import { runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Traffic" }

export default async function ServiceTrafficPage(
  props: PageProps<"/services/[name]/traffic">
) {
  await requireSession()
  const name = decodeURIComponent((await props.params).name)
  const { period } = await props.searchParams
  return (
    <ServiceTraffic runner={runner()} root="" name={name} period={period} />
  )
}
