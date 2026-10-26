"use server"
// Signing in and out. Everything else the panel changes goes through
// /runner-api from the browser, so the runner's own errors reach the page.
import { redirect } from "next/navigation"

import { checkPassword, endSession, startSession } from "./session"

type FormState = { error?: string }

let failedAt = 0

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  // One wrong password a second, for everyone: enough for one admin.
  if (Date.now() - failedAt < 1000) {
    return { error: "Too many attempts. Wait a second." }
  }
  if (!checkPassword(String(form.get("password") ?? ""))) {
    failedAt = Date.now()
    return { error: "That is not the password." }
  }
  await startSession()
  redirect("/")
}

export async function signOut() {
  await endSession()
  redirect("/login")
}
