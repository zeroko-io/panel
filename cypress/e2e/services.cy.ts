// An agent's way in: a token, a service deployed with it through the
// panel's API, the service's pages, and taking it all back.
const service = `cy-${Date.now().toString(36)}`

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
          url: `/api/services/${service}/deployments`,
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
    cy.contains("a", service).click()
    cy.location("pathname").should("eq", `/services/${service}`)
    for (const tab of ["traffic", "logs", "versions", "data", "settings"]) {
      cy.open(`/services/${service}/${tab}`)
      cy.contains(service)
    }
  })

  it("deletes the service and revokes the token", () => {
    cy.open(`/services/${service}/settings`)
    cy.contains("button", "Delete service").click()
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
