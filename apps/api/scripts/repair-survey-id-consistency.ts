/**
 * Dry-run (default) or fix surveyId / parcel / property inconsistencies.
 *
 * Usage:
 *   pnpm --filter api repair:survey-ids
 *   pnpm --filter api repair:survey-ids -- --fix
 */

import "dotenv/config"

import { buildSurveyIdFromRecord, parseGisSurveyId } from "@workspace/types"

import { createPrismaClient } from "../src/prisma/prisma.client"
import { getUlbCode } from "../src/surveys/survey-id.util"

const prisma = createPrismaClient()
const fix = process.argv.includes("--fix")

async function main() {
  const ulbCode = getUlbCode()
  const surveys = await prisma.survey.findMany({
    where: { deletedAt: null },
    include: { ward: true },
  })

  let mismatches = 0
  let fixed = 0
  let skipped = 0

  for (const survey of surveys) {
    const parsed = parseGisSurveyId(survey.surveyId)
    const expected = buildSurveyIdFromRecord({
      surveyId: survey.surveyId,
      wardNumber: survey.ward.number,
      parcelNo: survey.parcelNo,
      propertyNo: survey.propertyNo,
      gisUseCode: parsed?.gisUseCode,
      ulbCode,
    })

    const parcelMismatch =
      survey.parcelNo != null &&
      parsed?.parcelNo != null &&
      survey.parcelNo !== parsed.parcelNo
    const propertyMismatch =
      survey.propertyNo != null &&
      parsed?.propertyNo != null &&
      survey.propertyNo !== parsed.propertyNo
    const idMismatch = survey.surveyId !== expected

    if (!idMismatch && !parcelMismatch && !propertyMismatch) continue

    mismatches++
    console.log(
      `[mismatch] id=${survey.id} stored=${survey.surveyId} expected=${expected} parcel=${survey.parcelNo} property=${survey.propertyNo}`
    )

    if (!fix) continue

    const clash = await prisma.survey.findUnique({
      where: { surveyId: expected },
    })
    if (clash && clash.id !== survey.id) {
      skipped++
      console.warn(
        `[skip] id=${survey.id} would collide with ${clash.id} for ${expected}`
      )
      continue
    }

    await prisma.survey.update({
      where: { id: survey.id },
      data: {
        surveyId: expected,
        parcelNo: parsed?.parcelNo ?? survey.parcelNo,
        propertyNo: parsed?.propertyNo ?? survey.propertyNo,
      },
    })
    fixed++
    console.log(`[fixed] id=${survey.id} -> ${expected}`)
  }

  console.log(
    JSON.stringify(
      {
        mode: fix ? "fix" : "dry-run",
        total: surveys.length,
        mismatches,
        fixed,
        skipped,
      },
      null,
      2
    )
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
