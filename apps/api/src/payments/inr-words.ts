import { roundMoney } from "../tax/tax-calc"

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
]

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
]

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? ""
  const ten = Math.floor(n / 10)
  const one = n % 10
  const tensWord = TENS[ten] ?? ""
  const onesWord = ONES[one] ?? ""
  return one === 0 ? tensWord : `${tensWord} ${onesWord}`.trim()
}

function threeDigits(n: number): string {
  if (n === 0) return ""
  if (n < 100) return twoDigits(n)
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  return rest === 0
    ? `${ONES[hundred]} Hundred`
    : `${ONES[hundred]} Hundred ${twoDigits(rest)}`
}

/** Convert a non-negative integer to Indian-grouping English words (no currency). */
export function integerToIndianWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("integerToIndianWords requires a non-negative finite number")
  }
  const value = Math.floor(n)
  if (value === 0) return "Zero"

  const crore = Math.floor(value / 10_000_000)
  const lakh = Math.floor((value % 10_000_000) / 100_000)
  const thousand = Math.floor((value % 100_000) / 1_000)
  const hundred = value % 1_000

  const parts: string[] = []
  if (crore > 0) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh > 0) parts.push(`${threeDigits(lakh)} Lakh`)
  if (thousand > 0) parts.push(`${threeDigits(thousand)} Thousand`)
  if (hundred > 0) parts.push(threeDigits(hundred))
  return parts.join(" ")
}

/**
 * English amount-in-words for INR with Indian grouping.
 * Examples: "Rupees Two Hundred Fifty Only", "Rupees Two Hundred Fifty and Paise Fifty Only"
 */
export function formatInrAmountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("formatInrAmountInWords requires a non-negative finite amount")
  }
  const rounded = roundMoney(amount)
  const rupees = Math.floor(rounded + 1e-9)
  const paise = Math.round((rounded - rupees) * 100)

  if (rupees === 0 && paise === 0) {
    return "Rupees Zero Only"
  }

  const rupeeWords = integerToIndianWords(rupees)
  if (paise === 0) {
    return `Rupees ${rupeeWords} Only`
  }
  const paiseWords = integerToIndianWords(paise)
  if (rupees === 0) {
    return `Rupees Zero and Paise ${paiseWords} Only`
  }
  return `Rupees ${rupeeWords} and Paise ${paiseWords} Only`
}
