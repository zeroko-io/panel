// A page that isn't there, in the Ledger look, for any panel.
import { Button } from "@/components/ui/button"
import { Kicker, Logo } from "@/components/ui/ledger"
import { TopLink } from "@/components/ui/navigation"

export function NotFoundScreen({
  home = "/",
  homeLabel = "Back to the start",
  bare,
}: {
  home?: string
  homeLabel?: string
  /** Outside a panel's layout: with the logo, centered on the page. */
  bare?: boolean
}) {
  const body = (
    <div className="flex max-w-[560px] flex-col gap-6">
      <Kicker>404</Kicker>
      <h1 className="font-serif text-[44px] leading-[1.05] font-normal tracking-[-0.02em]">
        Nothing here.{" "}
        <span className="text-muted-foreground italic">
          It moved, it was deleted, or it&apos;s someone else&apos;s.
        </span>
      </h1>
      <div>
        <Button asChild>
          <TopLink href={home}>{homeLabel}</TopLink>
        </Button>
      </div>
    </div>
  )
  if (!bare) {
    return <div className="flex grow flex-col pt-8">{body}</div>
  }
  return (
    <div className="flex min-h-svh flex-col p-6 md:p-14">
      <TopLink href={home} aria-label="Zeroko">
        <Logo />
      </TopLink>
      <div className="flex grow items-center">{body}</div>
    </div>
  )
}
