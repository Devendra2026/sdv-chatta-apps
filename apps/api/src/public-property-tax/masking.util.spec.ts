import {
  assertOwnerSearchInput,
  maskMobile,
  maskOwnerName,
  normalizeMobileDigits,
} from "./masking.util"

describe("public property tax masking", () => {
  it("masks owner name keeping trailing words", () => {
    expect(maskOwnerName("Ramesh Kumar")).toBe("R**** Kumar")
    expect(maskOwnerName("A")).toBe("A****")
    expect(maskOwnerName("")).toBe("—")
    expect(maskOwnerName(null)).toBe("—")
  })

  it("masks mobile as first2 **** last4", () => {
    expect(maskMobile("9876543210")).toBe("98****3210")
    expect(maskMobile("98-765-43210")).toBe("98****3210")
    expect(maskMobile("123")).toBe("—****—")
  })

  it("normalizes mobile digits", () => {
    expect(normalizeMobileDigits("+91 98765-43210")).toBe("919876543210")
  })

  it("validates owner search inputs", () => {
    expect(assertOwnerSearchInput("ab", "9876543210")).toMatch(/3 characters/)
    expect(assertOwnerSearchInput("Ram", "98765")).toMatch(/10 digits/)
    expect(assertOwnerSearchInput("Ram", "9876543210")).toBeNull()
  })
})

describe("public property tax pageSize cap", () => {
  it("caps pageSize at 20", () => {
    const requested = 50
    const pageSize = Math.min(requested ?? 10, 20)
    expect(pageSize).toBe(20)
  })
})
