"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"

import { Indicator } from "@/components/ui/action"
import { THEME_COOKIE, type Theme } from "@/lib/theme"

const choices: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Follow the system", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
]

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === "system") delete root.dataset.theme
  else root.dataset.theme = theme
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
}

/** Auto, light or dark: kept in a cookie so the server draws the right
 * theme, and switched with a crossfade where the browser can. */
function ThemeSwitch({
  initial,
  className,
}: {
  initial: Theme
  className?: string
}) {
  const [theme, setTheme] = React.useState(initial)
  const choose = (next: Theme) => {
    if (next === theme) return
    setTheme(next)
    const root = document.documentElement
    if (!document.startViewTransition) return apply(next)
    root.setAttribute("data-theme-switching", "")
    document
      .startViewTransition(() => apply(next))
      .finished.finally(() => root.removeAttribute("data-theme-switching"))
  }
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "relative inline-flex items-center rounded-lg border p-0.5",
        className
      )}
    >
      <Indicator />
      {choices.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "relative grid size-6 place-items-center rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            theme === value
              ? "text-foreground"
              : "text-faint hover:text-foreground"
          )}
        >
          <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  )
}

export { ThemeSwitch }
