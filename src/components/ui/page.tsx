import { ViewTransition } from "react"

/** A page's content. On navigation it fades in; links marked nav-forward or
 * nav-back slide it instead. Refreshes after an action don't animate it. */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "page-in",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "page-out",
      }}
      default="none"
    >
      <div className="flex flex-col gap-8">{children}</div>
    </ViewTransition>
  )
}

/** The name of a service, as one element across pages: it moves from the
 * list into the detail page's title. */
export function ServiceName({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <ViewTransition name={`service-${id}`} share="morph" default="none">
      <span className="inline-block">{children}</span>
    </ViewTransition>
  )
}
