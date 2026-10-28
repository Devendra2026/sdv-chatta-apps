import { formatInrAmountInWords, integerToIndianWords } from "./inr-words"

describe("formatInrAmountInWords", () => {
  it("formats zero", () => {
    expect(formatInrAmountInWords(0)).toBe("Rupees Zero Only")
  })

  it("formats whole rupees", () => {
    expect(formatInrAmountInWords(250)).toBe("Rupees Two Hundred Fifty Only")
  })

  it("formats rupees and paise", () => {
    expect(formatInrAmountInWords(250.5)).toBe(
      "Rupees Two Hundred Fifty and Paise Fifty Only"
    )
  })

  it("formats one lakh", () => {
    expect(formatInrAmountInWords(100_000)).toBe("Rupees One Lakh Only")
  })

  it("formats paise-only amount", () => {
    expect(formatInrAmountInWords(0.25)).toBe(
      "Rupees Zero and Paise Twenty Five Only"
    )
  })

  it("rejects negative amounts", () => {
    expect(() => formatInrAmountInWords(-1)).toThrow()
  })
})

describe("integerToIndianWords", () => {
  it("formats crore and lakh", () => {
    expect(integerToIndianWords(12_345_678)).toBe(
      "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight"
    )
  })
})
