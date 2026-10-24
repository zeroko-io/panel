// Copying text. The Clipboard API exists only on secure pages (HTTPS or
// localhost); a panel served over plain HTTP, as on a local network, copies
// through a hidden text field instead.

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const field = document.createElement("textarea")
  field.value = text
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.opacity = "0"
  document.body.append(field)
  field.select()
  const ok = document.execCommand("copy")
  field.remove()
  if (!ok) throw new Error("The browser didn't copy it.")
}
