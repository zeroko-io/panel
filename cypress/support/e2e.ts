// Commands every spec has.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visits a page, once it's hydrated. */
      open(url: string, options?: Partial<VisitOptions>): Chainable<void>
      /** Signs in with the admin password, once per spec. */
      signIn(): Chainable<void>
    }
  }
}

// Visits a page and waits until React has hydrated it: a click before that
// does nothing.
Cypress.Commands.add(
  "open",
  (url: string, options?: Partial<Cypress.VisitOptions>) => {
    cy.visit(url, options)
    cy.get("html[data-hydrated]", { log: false })
  }
)

Cypress.Commands.add("signIn", () => {
  cy.session("admin", () => {
    cy.open("/login")
    cy.env(["password"]).then(({ password }) =>
      cy.get("input[name=password]").type(password, { log: false })
    )
    cy.contains("button", "Continue").click()
    cy.location("pathname").should("eq", "/")
  })
})

export {}
