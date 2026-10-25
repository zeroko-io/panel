// An agent's way in: a token, a service deployed with it through the
// panel's API, the service's pages, renaming it, and taking it all back.
const first = `cy-${Date.now().toString(36)}`
const service = `${first}-renamed`

describe("services", () => {
  beforeEach(() => cy.signIn())

  it("makes a token, deploys with it, and shows the service", () => {
    cy.open("/tokens")
    cy.get("input[name=name]").type("cypress")
    cy.contains("button", "Create token").click()
    cy.get("code")
      .invoke("text")
      .then((token) => {
        cy.request({
          method: "POST",
          url: `/api/services/${first}/deployments`,
          headers: { Authorization: `Bearer ${token.trim()}` },
          body: {
            files: {
              "index.js":
                'export default { fetch: () => new Response("hello from cypress") }',
            },
          },
        })
          .its("body.deployment.status")
          .should("eq", "ready")
      })
    cy.open("/")
    cy.contains("a", first).click()
    cy.location("pathname").should("eq", `/services/${first}`)
    for (const tab of ["traffic", "logs", "versions", "data", "settings"]) {
      cy.open(`/services/${first}/${tab}`)
      cy.contains(first)
    }
  })

  it("renames the service", () => {
    cy.open(`/services/${first}/settings`)
    cy.get("input[aria-label='New name']").clear().type(service)
    cy.contains("button", "Rename").click()
    cy.get("dialog[open] button[value=ok]").click()
    cy.location("pathname").should("eq", `/services/${service}/settings`)
    cy.get("input[aria-label='New name']").should("have.value", service)
  })

  it("deletes the service and revokes the token", () => {
    cy.open(`/services/${service}/settings`)
    cy.contains("main button", "Delete service").click()
    cy.get("dialog[open] button[value=ok]").should("be.disabled")
    cy.get("dialog[open] input[name=confirm]").type(service)
    cy.get("dialog[open] button[value=ok]").click()
    cy.location("pathname").should("eq", "/")
    cy.contains("a", service).should("not.exist")
    cy.open("/tokens")
    cy.contains("tr", "cypress").contains("button", "Revoke").click()
    cy.get("dialog[open] button[value=ok]").click()
    cy.contains("tr", "cypress").should("not.exist")
  })

  it("shows the system", () => {
    cy.open("/system")
    cy.get("h1").should("contain", "System")
  })
})
