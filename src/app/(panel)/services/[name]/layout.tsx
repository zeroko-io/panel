import { ServiceFrame } from "@/screens/service"

import { runner } from "@/lib/runner-server"
import { requireSession } from "@/lib/session"

export default async function ServiceLayout(
  props: LayoutProps<"/services/[name]">
) {
  await requireSession()
  const name = decodeURIComponent((await props.params).name)
  return (
    <ServiceFrame runner={runner()} root="" name={name}>
      {props.children}
    </ServiceFrame>
  )
}
