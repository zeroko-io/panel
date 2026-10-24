// What several parts of one page ask a runner for, asked once per request.
// React's cache keys on the runner too: a panel makes one Runner per request
// (with cache) so that its layout and page share these.
import { cache } from "react"

import type { Runner } from "@/lib/runner"

export const loadSettings = cache((r: Runner) => r.settings())
export const loadSystem = cache((r: Runner) => r.system())
export const loadService = cache((r: Runner, name: string) => r.service(name))
