import type { Metadata } from "next"
import { ServiceVersions } from "@/screens/service"

import { runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Versions" }

export default async function ServiceVersionsPage(
  props: PageProps<"/services/[name]/versions">
) {
  await requireSession()
  const name = decodeURIComponent((await props.params).name)
  return <ServiceVersions runner={runner()} root="" name={name} />
}
