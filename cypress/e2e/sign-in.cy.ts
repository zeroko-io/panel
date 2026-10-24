// The panel is the admin's: nothing without the password.
describe("sign-in", () => {
  it("sends to sign in, and refuses a wrong password", () => {
    cy.open("/")
    cy.location("pathname").should("eq", "/login")
    cy.get("input[name=password]").type("not the password")
    cy.contains("button", "Continue").click()
    cy.get("[aria-invalid=true]").should("exist")
    cy.location("pathname").should("eq", "/login")
  })

  it("signs in and out", () => {
    cy.open("/login")
    cy.env(["password"]).then(({ password }) =>
      cy.get("input[name=password]").type(password, { log: false })
    )
    cy.contains("button", "Continue").click()
    cy.get("h1").should("have.text", "Services")
    cy.contains("button", "Sign out").click({ force: true })
    cy.location("pathname").should("eq", "/login")
  })

  it("keeps the runner's API for tokens", () => {
    cy.request({ url: "/api/services", failOnStatusCode: false })
      .its("status")
      .should("eq", 401)
  })
})
