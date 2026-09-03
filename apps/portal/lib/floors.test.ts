import assert from "node:assert/strict"
import test from "node:test"

import {
  FLOOR_LABELS,
  OPEN_FLOOR_LABEL,
  floorLabelsForPropertyUse,
} from "./floors"
import { pickBestSurveySearchMatch } from "./survey-format"

test("floor labels include Open only for Open Land property use", () => {
  assert.equal(
    floorLabelsForPropertyUse("Residential Self").includes(OPEN_FLOOR_LABEL),
    false
  )
  assert.equal(
    floorLabelsForPropertyUse(undefined).includes(OPEN_FLOOR_LABEL),
    false
  )
  assert.equal(
    floorLabelsForPropertyUse("Open Land").includes(OPEN_FLOOR_LABEL),
    true
  )
  assert.equal(
    floorLabelsForPropertyUse("  open land  ").includes(OPEN_FLOOR_LABEL),
    true
  )
  assert.deepEqual(
    floorLabelsForPropertyUse("Open Land").at(-1),
    OPEN_FLOOR_LABEL
  )
  assert.equal(
    floorLabelsForPropertyUse("Open Land").length,
    FLOOR_LABELS.length + 1
  )
})

test("pickBestSurveySearchMatch prefers exact padded parcel over first hit", () => {
  const rows = [
    { id: "a", surveyId: "249044-001-000013-001-R", parcelNo: "000013" },
    { id: "b", surveyId: "249044-001-000131-001-R", parcelNo: "000131" },
  ]
  const match = pickBestSurveySearchMatch(rows, "131")
  assert.equal(match?.id, "b")
})
