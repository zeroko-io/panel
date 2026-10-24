"use client"

// Toasts and the confirm dialog: called from anywhere (toast("Saved"),
// await confirm("Delete it?")), drawn by <Toaster/> and <ConfirmDialog/>
// once in the layout.
import * as React from "react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

type Toast = { id: number; text: string; error: boolean; leaving?: boolean }

let push: (t: Toast) => void = () => {}
let nextId = 0

/** Says something happened; an error stays longer and reads as one. */
/** Next navigates by throwing (redirect, notFound): from an action awaited
 * in the browser, that reaches here and is no failure. */
function navigating(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest
  return typeof digest === "string" && digest.startsWith("NEXT_")
}

function toast(message: unknown, error = false) {
  if (navigating(message)) return
  const text = message instanceof Error ? message.message : String(message)
  push({ id: ++nextId, text, error })
}

function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([])
  // A toast leaves with a short fade, then goes.
  const dismiss = React.useCallback((id: number) => {
    setItems((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    )
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 180)
  }, [])
  React.useEffect(() => {
    push = (t) => {
      setItems((list) => [...list.slice(-3), t])
      setTimeout(() => dismiss(t.id), t.error ? 8000 : 3200)
    }
    return () => {
      push = () => {}
    }
  }, [dismiss])
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2 max-sm:inset-x-4 max-sm:bottom-4 max-sm:items-stretch"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role={t.error ? "alert" : "status"}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex max-w-[420px] animate-in items-baseline gap-3 rounded-lg border bg-card py-2.5 pr-4 pl-3.5 text-left text-[13px] wrap-anywhere whitespace-pre-wrap shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] duration-200 fade-in slide-in-from-bottom-2",
            t.error ? "border-destructive/50" : "border-border",
            t.leaving &&
              "animate-out duration-150 fill-mode-forwards fade-out slide-out-to-right-2"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-[7px] shrink-0 translate-y-[-1px]",
              t.error ? "bg-destructive" : "bg-ok"
            )}
          />
          <span className={t.error ? "text-destructive" : undefined}>
            {t.text}
          </span>
        </button>
      ))}
    </div>
  )
}

type Ask = { message: string; action: string; danger: boolean }

let open: (ask: Ask, done: (ok: boolean) => void) => void = () => {}

/** Asks before doing something; resolves true when the user agrees. */
function confirm(
  message: string,
  action = "Delete",
  { danger = true }: { danger?: boolean } = {}
): Promise<boolean> {
  return new Promise((resolve) => open({ message, action, danger }, resolve))
}

function ConfirmDialog() {
  const ref = React.useRef<HTMLDialogElement>(null)
  const done = React.useRef<(ok: boolean) => void>(() => {})
  const [ask, setAsk] = React.useState<Ask>({
    message: "",
    action: "",
    danger: true,
  })
  React.useEffect(() => {
    open = (next, resolve) => {
      done.current = resolve
      setAsk(next)
      const d = ref.current
      if (!d) return resolve(false)
      d.returnValue = ""
      d.showModal()
    }
    return () => {
      open = () => {}
    }
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={() => done.current(ref.current?.returnValue === "ok")}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-lg border bg-card p-0 text-foreground shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] backdrop:bg-background/70 backdrop:backdrop-blur-[2px] open:animate-in open:duration-200 open:fade-in open:zoom-in-[0.98]"
    >
      <form method="dialog" className="flex flex-col gap-6 p-6">
        <p className="font-serif text-lg leading-snug">{ask.message}</p>
        <div className="flex justify-end gap-2.5">
          <Button value="cancel" variant="outline" autoFocus>
            Cancel
          </Button>
          <Button value="ok" variant={ask.danger ? "destructive" : "default"}>
            {ask.action}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export { ConfirmDialog, confirm, toast, Toaster }
