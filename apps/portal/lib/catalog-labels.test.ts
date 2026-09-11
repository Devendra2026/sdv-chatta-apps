import assert from "node:assert/strict"
import test from "node:test"

import {
  formatCatalogDisplay,
  formatCatalogLabel,
  humanizeSnakeCase,
} from "./catalog-labels"

test("formatCatalogLabel maps known messy catalog strings", () => {
  assert.equal(formatCatalogLabel("rcc road"), "RCC Road")
  assert.equal(formatCatalogLabel("Other(null)"), "Other")
  assert.equal(
    formatCatalogLabel("Restuurents/lodging house"),
    "Restaurants / Lodging House"
  )
  assert.equal(formatCatalogLabel("Shops/Office Bank"), "Shops / Office / Bank")
  assert.equal(formatCatalogLabel("Open"), "Open Land")
})

test("formatCatalogLabel maps legacy SNAKE_CASE codes", () => {
  assert.equal(
    formatCatalogLabel("LIMITED_COMPANY_FIRM"),
    "Limited Company / Firm"
  )
  assert.equal(formatCatalogLabel("GROUND_FLOOR"), "Ground Floor")
  assert.equal(formatCatalogLabel("SHOP_BAKERY"), "Shop / Bakery")
  assert.equal(
    formatCatalogLabel("HOTEL_MARRIAGE_RESTAURANT"),
    "Hotel / Marriage Hall / Restaurant"
  )
})

test("formatCatalogLabel leaves Excel Title Case strings unchanged", () => {
  assert.equal(formatCatalogLabel("Residential Self"), "Residential Self")
  assert.equal(
    formatCatalogLabel("RATE ZONE 1 (Upto 9 Meters)"),
    "RATE ZONE 1 (Upto 9 Meters)"
  )
  assert.equal(
    formatCatalogLabel("Pakka Building with R.C.C Roof or R.B. Roof"),
    "Pakka Building with R.C.C Roof or R.B. Roof"
  )
  assert.equal(
    formatCatalogLabel("Individual (Single/Joint)"),
    "Individual (Single/Joint)"
  )
})

test("formatCatalogLabel humanizes unknown SNAKE_CASE", () => {
  assert.equal(humanizeSnakeCase("SOME_NEW_CODE"), "Some New Code")
  assert.equal(formatCatalogLabel("SOME_NEW_CODE"), "Some New Code")
})

test("formatCatalogLabel handles empty and trims", () => {
  assert.equal(formatCatalogLabel(""), "")
  assert.equal(formatCatalogLabel(null), "")
  assert.equal(formatCatalogLabel("  rcc road  "), "RCC Road")
  assert.equal(formatCatalogDisplay(""), "—")
  assert.equal(formatCatalogDisplay("Open Land"), "Open Land")
})
