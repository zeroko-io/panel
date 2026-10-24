"use client"

import * as React from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

/** A form's submit button that says what is happening while its action
 * runs, and can't be pressed twice. */
function SubmitButton({
  pending: pendingLabel,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}

export { SubmitButton }
