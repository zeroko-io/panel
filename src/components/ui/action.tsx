"use client"

// Buttons that run something: busy while it runs, its error as a toast.
import { ChevronRight } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

import { Button, buttonVariants } from "@/components/ui/button"
import { toast } from "@/components/ui/feedback"

type ButtonProps = React.ComponentProps<typeof Button>

/** Runs an async action on click; shows `pending` while it runs. */
function ActionButton({
  run,
  pending: pendingLabel,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  run: () => Promise<unknown>
  pending?: React.ReactNode
}) {
  const [busy, setBusy] = React.useState(false)
  return (
    <Button
      type="button"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      onClick={async () => {
        setBusy(true)
        try {
          await run()
        } catch (err) {
          toast(err, true)
        } finally {
          setBusy(false)
        }
      }}
      {...props}
    >
      {busy && pendingLabel ? pendingLabel : children}
    </Button>
  )
}

/** Picks a file and runs an action with it. */
function FileButton({
  accept,
  run,
  multiple,
  variant = "outline",
  size,
  className,
  children,
}: {
  accept?: string
  run: (files: File[]) => Promise<unknown>
  multiple?: boolean
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  className?: string
  children: React.ReactNode
}) {
  const [busy, setBusy] = React.useState(false)
  return (
    <label
      aria-busy={busy || undefined}
      className={cn(
        buttonVariants({ variant, size }),
        "cursor-pointer",
        busy && "pointer-events-none opacity-50",
        className
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        disabled={busy}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (!files.length) return
          setBusy(true)
          try {
            await run(files)
          } catch (err) {
            toast(err, true)
          } finally {
            setBusy(false)
          }
        }}
      />
    </label>
  )
}

/** A choice among a few options, as a row of small mono buttons. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: readonly (readonly [T, React.ReactNode])[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex items-center rounded-lg border p-0.5 font-mono text-[11px] tracking-[0.06em] uppercase",
        className
      )}
    >
      <Indicator />
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          className={cn(
            "relative inline-flex h-6 items-center gap-1.5 rounded-sm px-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            v === value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

const activeChild =
  '[aria-checked="true"], [aria-current="page"], [aria-pressed="true"]'

/** The background of the chosen option in a row of options: put it first
 * in a relative parent whose options are relative too. It finds the option
 * marked checked, current or pressed, and slides to it. */
function Indicator({ className }: { className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const placed = React.useRef(false)
  React.useLayoutEffect(() => {
    const el = ref.current
    const place = () => {
      const active = el?.parentElement?.querySelector<HTMLElement>(activeChild)
      if (!el) return
      if (!active) {
        el.style.opacity = "0"
        return
      }
      // The first time, appear in place; after that, slide.
      el.style.transitionDuration = placed.current ? "" : "0s"
      el.style.opacity = "1"
      el.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
      el.style.width = `${active.offsetWidth}px`
      el.style.height = `${active.offsetHeight}px`
      placed.current = true
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  })
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0 rounded-sm bg-secondary opacity-0 transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        className
      )}
    />
  )
}

/** The first line of an error and, folded, the rest. */
function ErrorDetails({
  error,
  className,
}: {
  error: string
  className?: string
}) {
  const [first, ...rest] = error.split("\n")
  const more = rest.join("\n").trim()
  const base = cn("font-mono text-xs wrap-anywhere text-destructive", className)
  if (!more) return <p className={base}>{first}</p>
  return (
    <details className={cn("group", base)}>
      <summary className="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="text-faint transition-transform duration-200 group-open:rotate-90"
        >
          <ChevronRight className="size-3 translate-y-px" />
        </span>
        {first}
      </summary>
      <pre className="mt-2 overflow-auto rounded-lg border bg-field p-3 whitespace-pre-wrap text-muted-foreground">
        {more}
      </pre>
    </details>
  )
}

export { ActionButton, ErrorDetails, FileButton, Indicator, Segmented }
