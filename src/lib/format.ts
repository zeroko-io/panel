// How figures read across the panels: always in English, with tabular
// numbers from the stylesheet.

const number = new Intl.NumberFormat("en")

/** When this page renders: server components render once, so "now" is
 * the moment of the request. */
export function renderTime(): number {
  return Date.now()
}

export function formatNumber(n: number): string {
  return number.format(n)
}

/** Splits a byte count into a value and its unit, for figures. */
export function bytesParts(n: number): [string, string] {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return [
    n >= 10 || i === 0 ? Math.round(n).toString() : n.toFixed(1),
    units[i]!,
  ]
}

export function formatBytes(n: number): string {
  return bytesParts(n).join(" ")
}

/** "19:42:03", local time, from Unix milliseconds. */
export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", { hour12: false })
}

/** "2026-10-22", from Unix milliseconds. */
export function day(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** "1 row", "3 rows". */
export function plural(n: number, noun: string): string {
  return `${formatNumber(n)} ${noun}${n === 1 ? "" : "s"}`
}

/** "40s", "5m", "5h 12m", "3d 4h", from milliseconds. */
export function duration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400)
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
}

/** A latency bucket's bound: "≤ 25 ms", "≤ 2 s"; -1 is past the last. */
export function latency(ms: number): string {
  if (ms === 0) return "-"
  if (ms < 0) return "> 10 s"
  return ms < 1000 ? `≤ ${ms} ms` : `≤ ${ms / 1000} s`
}

/** "0.3%", or "-" when there is nothing to divide. */
export function rate(n: number, of: number): string {
  if (!of) return "-"
  const r = n / of
  return `${(r * 100).toFixed(n && r < 0.001 ? 2 : 1)}%`
}

/** "5m ago" or, in the future, "in 5m"; old dates as a day. */
export function relative(ms: number, now = Date.now()): string {
  const d = Math.round((now - ms) / 1000)
  const s = Math.abs(d)
  if (s < 60) return "just now"
  if (s >= 30 * 86400) return day(ms)
  const n =
    s < 3600
      ? `${Math.floor(s / 60)}m`
      : s < 86400
        ? `${Math.floor(s / 3600)}h`
        : `${Math.floor(s / 86400)}d`
  return d > 0 ? `${n} ago` : `in ${n}`
}
