"use client"

import { usePathname } from "next/navigation"
import { TabLink, TabNav } from "@/components/ui/ledger"

import { Pending, TopLink } from "@/components/ui/navigation"

const tabs = [
  {
    href: "/",
    label: "Services",
    match: (p: string) => p === "/" || p.startsWith("/services"),
  },
  {
    href: "/tokens",
    label: "Tokens",
    match: (p: string) => p.startsWith("/tokens"),
  },
  {
    href: "/system",
    label: "System",
    match: (p: string) => p.startsWith("/system"),
  },
]

export function Nav({ className }: { className?: string }) {
  const path = usePathname()
  return (
    <TabNav className={className}>
      {tabs.map((t) => (
        <TabLink key={t.href} asChild active={t.match(path)}>
          <TopLink href={t.href}>
            {t.label}
            <Pending />
          </TopLink>
        </TabLink>
      ))}
    </TabNav>
  )
}
