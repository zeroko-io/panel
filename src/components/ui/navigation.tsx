"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { useLayoutEffect, useRef } from "react"
import { TabLink, TabNav } from "@/components/ui/ledger"
import { cn } from "@/lib/utils"

/** Whether a click should navigate here, rather than open a tab. */
function plain(e: React.MouseEvent) {
  return !(
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0
  )
}

// Set by a TopLink's click, read when the new page commits.
let toTop = false

/** A link to another page that opens at its top. Next would scroll after
 * the new page is drawn, in the middle of the view transition, and
 * scrolling on the click would show the old page jump first: instead the
 * new page goes to the top as it commits (ScrollReset), inside the
 * transition, while the old one leaves from where it was. */
export function TopLink({
  onClick,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      scroll={false}
      onClick={(e) => {
        onClick?.(e)
        if (plain(e)) toTop = true
      }}
      {...props}
    />
  )
}

/** Puts a page a TopLink opened at its top, before it's painted. Back and
 * forward keep the browser's own scroll. Once, in the root layout. */
export function ScrollReset() {
  const path = usePathname()
  // Marks the page as alive (hydrated), for end-to-end tests to wait on.
  useLayoutEffect(() => {
    document.documentElement.dataset.hydrated = ""
  }, [])
  useLayoutEffect(() => {
    if (!toTop) return
    toTop = false
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [path])
  return null
}

/** Scrolls up to an element if the page is scrolled past it, so tabs stay
 * in view when what is under them changes length. */
function scrollUpTo(el: Element | null, offset = 72) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  if (window.scrollY > top) window.scrollTo({ top })
}

/** A faint line under a tab while its page loads. Lives inside a Link. */
export function Pending() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-3.5 bottom-0 h-px bg-foreground/40 opacity-0 transition-opacity duration-300",
        pending && "animate-pulse opacity-100 delay-100"
      )}
    />
  )
}

/** A page's own tabs, under its title; tab "" is the base path. Switching
 * keeps the page where it is, unless it was scrolled past the tabs. */
export function SubTabs({
  base,
  group,
  tabs,
}: {
  base: string
  group: string
  tabs: readonly (readonly [string, string])[]
}) {
  const path = usePathname()
  const nav = useRef<HTMLElement>(null)
  const current = path.slice(base.length).replace(/^\//, "").split("/")[0]
  return (
    <TabNav
      ref={nav}
      className="-mt-2 h-10 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]"
    >
      {tabs.map(([t, label]) => (
        <TabLink key={t} asChild group={group} active={current === t}>
          <Link
            href={t ? `${base}/${t}` : base}
            scroll={false}
            onClick={() => scrollUpTo(nav.current)}
          >
            {label}
            <Pending />
          </Link>
        </TabLink>
      ))}
    </TabNav>
  )
}
