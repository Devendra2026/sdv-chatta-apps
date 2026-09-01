import { ConflictException } from "@nestjs/common"
import type { Prisma, Ward } from "@prisma/client"
import {
  CHHATA_ULB_CODE,
  buildSurveyIdFromRecord,
  generateSurveyId,
  normalizeGisUseCode,
  normalizeParcelNo,
  normalizePropertyNo,
  parseGisSurveyId,
} from "@workspace/types"

export type SurveyIdentityInput = {
  surveyId?: string
  wardId?: string
  parcelNo?: string
  propertyNo?: string
  gisUseCode?: string
}

export type ResolvedSurveyIdentity = {
  parcelNo: string
  propertyNo: string
  gisUseCode: string
  surveyId: string
  ulbCode: string
}

export function getUlbCode(): string {
  return process.env.ULB_CODE?.trim() || CHHATA_ULB_CODE
}

export function resolveSurveyIdentity(
  ward: Pick<Ward, "number">,
  input: SurveyIdentityInput,
  current?: {
    surveyId: string
    parcelNo: string | null
    propertyNo: string | null
  } | null
): ResolvedSurveyIdentity {
  const parsed = current?.surveyId
    ? parseGisSurveyId(current.surveyId)
    : input.surveyId
      ? parseGisSurveyId(input.surveyId)
      : null

  const ulbCode = getUlbCode()
  const parcelRaw =
    input.parcelNo ?? current?.parcelNo ?? parsed?.parcelNo ?? ""
  const propertyRaw =
    input.propertyNo ?? current?.propertyNo ?? parsed?.propertyNo ?? ""
  const gisUseRaw =
    input.gisUseCode ?? parsed?.gisUseCode ?? ""

  const parcelNo = normalizeParcelNo(parcelRaw)
  const propertyNo = normalizePropertyNo(propertyRaw)
  const gisUseCode = normalizeGisUseCode(gisUseRaw)
  const surveyId = generateSurveyId({
    ulbCode,
    wardNo: ward.number,
    parcelNo,
    propertyNo,
    gisUseCode,
  })

  return { parcelNo, propertyNo, gisUseCode, surveyId, ulbCode }
}

export type SurveyIdRecord = {
  id: string
  surveyId: string
  parcelNo: string | null
  propertyNo: string | null
  deletedAt?: Date | null
}

/** Canonical GIS survey id from ward + parcel/property (ignores placeholder `000` ward segment). */
export function getExpectedSurveyIdFromRecord(
  survey: Pick<SurveyIdRecord, "surveyId" | "parcelNo" | "propertyNo">,
  wardNumber: number
): string {
  const parsed = parseGisSurveyId(survey.surveyId)
  return buildSurveyIdFromRecord({
    surveyId: survey.surveyId,
    wardNumber,
    parcelNo: survey.parcelNo,
    propertyNo: survey.propertyNo,
    gisUseCode: parsed?.gisUseCode,
    ulbCode: getUlbCode(),
  })
}

export function surveyIdNeedsRepair(
  survey: Pick<SurveyIdRecord, "surveyId" | "parcelNo" | "propertyNo">,
  wardNumber: number
): boolean {
  try {
    return survey.surveyId !== getExpectedSurveyIdFromRecord(survey, wardNumber)
  } catch {
    return false
  }
}

export function verifySurveyIdMatchesRecord(
  surveyId: string,
  wardNumber: number,
  parcelNo: string,
  propertyNo: string,
  gisUseCode: string
): boolean {
  const expected = buildSurveyIdFromRecord({
    wardNumber,
    parcelNo,
    propertyNo,
    gisUseCode,
    ulbCode: getUlbCode(),
  })
  return expected === surveyId
}

/** Repair legacy Excel placeholder ward segments (e.g. `249044-000-...` → `249044-001-...`). */
export async function repairSurveyIdIfNeeded(
  tx: Prisma.TransactionClient,
  survey: SurveyIdRecord,
  wardNumber: number
): Promise<string> {
  if (!surveyIdNeedsRepair(survey, wardNumber)) {
    return survey.surveyId
  }

  const expected = getExpectedSurveyIdFromRecord(survey, wardNumber)
  const parsed = parseGisSurveyId(expected)
  const clash = await tx.survey.findUnique({ where: { surveyId: expected } })
  if (clash && clash.id !== survey.id && !clash.deletedAt) {
    return survey.surveyId
  }

  await tx.survey.update({
    where: { id: survey.id },
    data: {
      surveyId: expected,
      parcelNo: parsed?.parcelNo ?? survey.parcelNo,
      propertyNo: parsed?.propertyNo ?? survey.propertyNo,
    },
  })

  return expected
}

export async function assertSurveyIdAvailable(
  tx: Prisma.TransactionClient,
  surveyId: string,
  excludeId?: string
): Promise<void> {
  const clash = await tx.survey.findUnique({ where: { surveyId } })
  if (clash && clash.id !== excludeId && !clash.deletedAt) {
    throw new ConflictException({
      code: "SURVEY_EXISTS",
      message:
        "A survey already exists for this ULB, ward, parcel, property and GIS use code.",
    })
  }
}
