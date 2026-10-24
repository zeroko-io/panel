// A column chart of requests over time, in the Ledger look: hairline base,
// columns that rise in, the hovered or focused column's numbers above it.
import * as React from "react"
import { cn } from "@/lib/utils"

import { formatNumber, latency, plural } from "@/lib/format"
import type { Metrics } from "@/lib/runner"

function RequestChart({
  data,
  className,
}: {
  data: Metrics
  className?: string
}) {
  const max = Math.max(1, ...data.points.map((p) => p.requests))
  const when = (t: number) =>
    new Date(t).toLocaleString(
      "en-GB",
      data.step >= 3600
        ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
        : { hour: "2-digit", minute: "2-digit" }
    )
  const n = data.points.length
  return (
    <figure className={cn("m-0 flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label="Requests over time"
        className="flex h-44 items-stretch gap-[3px] border-b"
      >
        {data.points.map((p, i) => (
          <div
            key={p.t}
            tabIndex={0}
            className="group relative flex flex-1 items-end outline-none"
          >
            <span className="absolute inset-0 transition-colors group-hover:bg-secondary/60 group-focus-visible:bg-secondary/60" />
            {p.requests > 0 && (
              <span
                className={cn(
                  "relative w-full origin-bottom animate-[zk-rise-bar_600ms_cubic-bezier(0.2,0.7,0.2,1)_both] transition-colors",
                  p.errors > 0
                    ? "bg-destructive/70 group-hover:bg-destructive"
                    : "bg-foreground/25 group-hover:bg-brand group-focus-visible:bg-brand"
                )}
                style={{
                  height: `${Math.max(2, (p.requests / max) * 100)}%`,
                  animationDelay: `${Math.min(i * 6, 300)}ms`,
                }}
              />
            )}
            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-[calc(100%+8px)] z-10 hidden flex-col gap-0.5 rounded-lg border bg-card px-3 py-2 font-mono text-[11px] whitespace-nowrap text-muted-foreground shadow-lg group-hover:flex group-focus-visible:flex",
                i < 3
                  ? "left-0"
                  : i >= n - 3
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2"
              )}
            >
              <span className="text-foreground">{when(p.t)}</span>
              <span>{plural(p.requests, "request")}</span>
              {p.errors > 0 && (
                <span className="text-destructive">
                  {formatNumber(p.errors)} 5xx
                </span>
              )}
              {p.exceptions > 0 && (
                <span>{plural(p.exceptions, "exception")}</span>
              )}
              {p.requests > 0 && <span>p95 {latency(p.p95)}</span>}
              {p.outbound > 0 && (
                <span>{plural(p.outbound, "outbound call")}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between font-mono text-[11px] text-faint">
        <span>{data.points[0] ? when(data.points[0].t) : ""}</span>
        <span>max {formatNumber(max)}</span>
        <span>now</span>
      </figcaption>
    </figure>
  )
}

export { RequestChart }
