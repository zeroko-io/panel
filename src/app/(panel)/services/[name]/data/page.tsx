import type { Metadata } from "next"
import { ServiceData } from "@/screens/service"

import { runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Data" }

export default async function ServiceDataPage(
  props: PageProps<"/services/[name]/data">
) {
  await requireSession()
  const name = decodeURIComponent((await props.params).name)
  return <ServiceData runner={runner()} root="" name={name} />
}
