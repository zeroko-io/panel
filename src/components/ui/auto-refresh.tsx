"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/** Redraws the page from the server every so often while it is visible, so
 * statuses and figures stay current. */
export function AutoRefresh({ every = 5000 }: { every?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh()
    }, every)
    return () => clearInterval(id)
  }, [router, every])
  return null
}
