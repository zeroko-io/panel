"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { copyText } from "@/lib/clipboard"

/** A button that copies text and says so for a moment. */
function CopyButton({
  text,
  children = "Copy",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & { text: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <Button
      type="button"
      onClick={() => copyText(text).then(() => setCopied(true))}
      {...props}
    >
      {copied ? "Copied" : children}
    </Button>
  )
}

export { CopyButton }
