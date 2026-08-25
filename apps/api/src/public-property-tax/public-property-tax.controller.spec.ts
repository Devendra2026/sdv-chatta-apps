import { PublicPropertyTaxController } from "./public-property-tax.controller"

describe("PublicPropertyTaxController auth", () => {
  it("is not decorated with AuthGuard / PermissionGuard metadata", () => {
    const guards = Reflect.getMetadata(
      "__guards__",
      PublicPropertyTaxController
    )
    expect(guards).toBeUndefined()
  })
})
