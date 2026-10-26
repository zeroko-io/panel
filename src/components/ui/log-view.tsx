"use client"

import { ArrowDown } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

import { Segmented } from "@/components/ui/action"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/feedback"
import { Input } from "@/components/ui/input"
import { clock, plural } from "@/lib/format"

type LogLine = {
  id: number
  ts: number
  level: string
  text: string
  source?: string
}

const MAX_LINES = 2000

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

const levelColor: Record<string, string> = {
  error: "text-destructive",
  warn: "text-warn",
  debug: "text-faint",
}

const sourceColor: Record<string, string> = {
  request: "text-info",
  console: "text-foreground",
  fetch: "text-muted-foreground",
  runtime: "text-brand",
}

/** Tails a log: keeps the newest lines and lets the reader filter, pause
 * and follow. load(after) either waits for new lines (long polling, delay
 * 0) or answers at once and is called every delay ms. Remount it (key) to
 * start again. */
function LogView({
  load,
  empty,
  delay = 0,
  sources,
  levels,
  className,
}: {
  load: (after: number) => Promise<LogLine[]>
  empty: string
  delay?: number
  sources?: readonly (readonly [string, string])[]
  levels?: readonly (readonly [string, string])[]
  className?: string
}) {
  const [lines, setLines] = React.useState<LogLine[]>([])
  const [query, setQuery] = React.useState("")
  const [level, setLevel] = React.useState("")
  const [source, setSource] = React.useState("")
  const [paused, setPaused] = React.useState(false)
  const [follow, setFollow] = React.useState(true)
  const cursor = React.useRef(0)
  const box = React.useRef<HTMLDivElement>(null)
  const loadRef = React.useRef(load)
  React.useEffect(() => {
    loadRef.current = load
  })

  React.useEffect(() => {
    if (paused) return
    // One loop at a time: a stopped loop drops its answer in flight, so the
    // next asks again from the same cursor and no line comes twice.
    let stopped = false
    ;(async () => {
      while (!stopped) {
        try {
          const batch = await loadRef.current(cursor.current)
          if (stopped) return
          if (batch.length) {
            cursor.current = batch[batch.length - 1]!.id
            setLines((prev) => [...prev, ...batch].slice(-MAX_LINES))
          }
        } catch (err) {
          if (stopped) return
          toast(err, true)
          await sleep(5000)
        }
        if (delay) await sleep(delay)
      }
    })()
    return () => {
      stopped = true
    }
  }, [paused, delay])

  const q = query.trim().toLowerCase()
  const shown = lines.filter(
    (l) =>
      (!level || l.level === level) &&
      (!source || l.source === source) &&
      (!q || l.text.toLowerCase().includes(q))
  )

  React.useLayoutEffect(() => {
    const el = box.current
    if (el && follow) el.scrollTop = el.scrollHeight
  }, [shown.length, follow])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        {levels && (
          <Segmented
            label="Level"
            value={level}
            onChange={setLevel}
            options={[["", "All"], ...levels]}
          />
        )}
        {sources && (
          <Segmented
            label="Source"
            value={source}
            onChange={setSource}
            options={[["", "All"], ...sources]}
          />
        )}
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter"
          aria-label="Filter the log"
          className="h-8 w-auto min-w-40 flex-1 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setLines([])}>
          Clear
        </Button>
      </div>
      <div className="relative">
        <div
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget
            setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
          }}
          className="h-[520px] overflow-auto border-y py-2 font-mono text-xs leading-[1.75] max-sm:h-[62vh]"
        >
          {shown.length === 0 && (
            <p className="py-16 text-center font-serif text-base text-muted-foreground italic">
              {lines.length ? "No lines match the filter." : empty}
            </p>
          )}
          {shown.map((l) => {
            const tag = l.source ?? l.level
            return (
              <div
                key={l.id}
                className="flex items-baseline gap-[18px] px-1 wrap-anywhere whitespace-pre-wrap transition-colors hover:bg-secondary/50"
              >
                <span className="shrink-0 text-faint max-sm:hidden">
                  {clock(l.ts)}
                </span>
                <span
                  className={cn(
                    "w-[60px] shrink-0 truncate",
                    (l.source ? sourceColor[tag] : levelColor[tag]) ??
                      "text-faint"
                  )}
                >
                  {tag}
                </span>
                <span className={cn("min-w-0 flex-1", levelColor[l.level])}>
                  {l.text}
                </span>
              </div>
            )
          })}
        </div>
        {!follow && (
          <Button
            size="sm"
            className="absolute right-3 bottom-3 animate-in shadow-lg duration-200 fade-in slide-in-from-bottom-1"
            onClick={() => setFollow(true)}
          >
            Latest <ArrowDown aria-hidden />
          </Button>
        )}
      </div>
      <p className="flex items-center gap-2.5 font-mono text-[11px] text-faint">
        <span
          aria-hidden
          className={cn(
            "size-1.5",
            paused ? "bg-faint" : "animate-breathe bg-ok"
          )}
        />
        {paused ? "Paused" : "Live"} -{" "}
        {shown.length === lines.length
          ? plural(lines.length, "line")
          : `${shown.length} of ${plural(lines.length, "line")}`}
      </p>
    </div>
  )
}

export { LogView }
