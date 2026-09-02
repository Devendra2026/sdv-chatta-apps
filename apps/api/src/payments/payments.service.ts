import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { PaymentMode, PaymentStatus, Prisma } from "@prisma/client"
import { randomUUID } from "node:crypto"

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import {
  assertPaymentAccess,
  assertSurveyAccess,
} from "../auth/resource-access"
import {
  computePublicDuesPayload,
  pickLatestPublishedConfig,
} from "../public-property-tax/dues.util"
import { PrismaService } from "../prisma/prisma.service"
import {
  AtomNdpsProvider,
  extractAtomTxnFields,
  parseAtomEncryptedCallback,
} from "./providers/atom-ndps.provider"
import type { PaymentGatewayProvider } from "./providers/payment-provider"
import { SandboxPaymentProvider } from "./providers/sandbox.provider"

const AMOUNT_TOLERANCE = 0.01

export function buildPaymentCallbackIdempotencyKey(input: {
  merchTxnId?: string
  atomTxnId?: string
  idempotencyKey?: string
}) {
  return (
    input.idempotencyKey ||
    `${input.merchTxnId ?? "na"}:${input.atomTxnId ?? "na"}`
  )
}

export function amountsMatchWithinTolerance(
  expected: number,
  actual: number,
  tolerance = AMOUNT_TOLERANCE
) {
  return Math.abs(expected - actual) <= tolerance
}

function isGatewaySuccess(statusCode: string) {
  return (
    statusCode === "OTS0000" ||
    statusCode === "SUCCESS" ||
    statusCode.toUpperCase() === "SUCCESS"
  )
}

function defaultCitizenReturnUrl() {
  return (
    process.env.ATOM_RETURN_URL ??
    "http://localhost:3001/propertytax/payment/return"
  )
}

function defaultCallbackUrl() {
  return (
    process.env.ATOM_CALLBACK_URL ??
    "http://localhost:4000/api/v1/payments/gateway/callback"
  )
}

/** Browser return target Atom should POST/GET to (API then 302s to citizen web). */
function defaultGatewayReturnUrl() {
  if (process.env.ATOM_GATEWAY_RETURN_URL?.trim()) {
    return process.env.ATOM_GATEWAY_RETURN_URL.trim()
  }
  const callback = defaultCallbackUrl()
  if (callback.includes("/gateway/callback")) {
    return callback.replace("/gateway/callback", "/gateway/return")
  }
  return "http://localhost:4000/api/v1/payments/gateway/return"
}

function citizenReturnRedirectUrl(merchTxnId: string | undefined) {
  const base = defaultCitizenReturnUrl()
  const url = new URL(base)
  if (merchTxnId) url.searchParams.set("merchTxnId", merchTxnId)
  return url.toString()
}

@Injectable()
export class PaymentsService {
  private provider: PaymentGatewayProvider

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {
    const mode = process.env.PAYMENT_PROVIDER ?? "sandbox"
    this.provider =
      mode === "atom" ? new AtomNdpsProvider() : new SandboxPaymentProvider()
  }

  async createOnline(
    input: {
      amount: number
      surveyId?: string
      wardId?: string
      payerName?: string
      payerMobile?: string
      payerEmail?: string
    },
    user: AuthUser
  ) {
    if (!input.surveyId?.trim()) {
      throw new BadRequestException({
        code: "SURVEY_REQUIRED",
        message: "Select a property/survey before starting online payment",
      })
    }

    const { amount, survey, wardId } = await this.resolveSurveyPayableAmount(
      input.surveyId
    )
    assertSurveyAccess(user, survey, "read")
    assertPaymentAccess(user, { id: "", collectedById: user.id }, "create")

    return this.createOnlinePayment(
      {
        amount,
        surveyId: survey.id,
        wardId: input.wardId?.trim() || wardId,
        payerName: input.payerName?.trim() || survey.ownerName || undefined,
        payerMobile: input.payerMobile?.trim() || survey.mobile || undefined,
        payerEmail: input.payerEmail?.trim() || undefined,
      },
      user.id
    )
  }

  /** Citizen website online payment — no staff collector. */
  async createCitizenOnline(input: {
    amount: number
    surveyId: string
    wardId: string
    payerName?: string
    payerMobile: string
    payerEmail?: string
  }) {
    return this.createOnlinePayment(input, null)
  }

  private async resolveSurveyPayableAmount(surveyId: string) {
    const id = surveyId.trim()
    const survey = await this.prisma.survey.findFirst({
      where: { id, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        surveyId: true,
        ownerName: true,
        mobile: true,
        propertyNo: true,
        parcelNo: true,
        houseNo: true,
        streetName: true,
        locality: true,
        colony: true,
        city: true,
        pincode: true,
        propertyUse: true,
        taxRateZone: true,
        roadType: true,
        hasMunicipalWaterSupply: true,
        plotAreaSqFt: true,
        plinthAreaSqFt: true,
        totalBuiltUpAreaSqFt: true,
        wardId: true,
        createdById: true,
        ward: { select: { id: true, number: true, name: true } },
        floors: {
          orderBy: { sortOrder: "asc" },
          select: {
            floorLabel: true,
            usageType: true,
            usageFactor: true,
            buildingType: true,
            areaSqFt: true,
          },
        },
      },
    })

    if (!survey) {
      throw new NotFoundException({
        code: "SURVEY_NOT_FOUND",
        message: "Property/survey was not found",
      })
    }

    const published = await this.prisma.taxConfig.findMany({
      where: {
        wardId: survey.ward.id,
        status: "PUBLISHED",
      },
      include: {
        assessmentYear: {
          select: { id: true, code: true, name: true },
        },
        cells: {
          include: {
            roadWidthEntry: { select: { code: true } },
            constructionEntry: { select: { code: true } },
          },
        },
      },
    })

    const config = pickLatestPublishedConfig(published)
    if (!config) {
      throw new NotFoundException({
        code: "TAX_CONFIG_NOT_PUBLISHED",
        message:
          "Published tax rates are not available for this ward yet. Please contact the municipal office.",
      })
    }

    const dues = computePublicDuesPayload(survey, config)
    const amount = Number(dues.tax.totalDemand)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: "DUES_NOT_PAYABLE",
        message:
          "Tax dues are not payable for this property yet. Published rates may be missing or zero.",
      })
    }

    return { amount, survey, wardId: survey.wardId }
  }

  private async createOnlinePayment(
    input: {
      amount: number
      surveyId?: string
      wardId?: string
      payerName?: string
      payerMobile?: string
      payerEmail?: string
    },
    collectedById: string | null
  ) {
    const merchTxnId = `CHH-${Date.now()}-${randomUUID().slice(0, 8)}`
    const payment = await this.prisma.payment.create({
      data: {
        paymentReference: merchTxnId,
        merchTxnId,
        amount: input.amount,
        paymentMode: PaymentMode.ONLINE,
        status: PaymentStatus.INITIATED,
        gateway: this.provider.name,
        surveyId: input.surveyId,
        wardId: input.wardId,
        payerName: input.payerName,
        payerMobile: input.payerMobile,
        payerEmail: input.payerEmail,
        collectedById: collectedById ?? undefined,
        refundableAmount: input.amount,
      },
    })

    // Atom posts encData to API return endpoint; API redirects to citizen web.
    const returnUrl = defaultGatewayReturnUrl()
    const result = await this.provider.createPayment({
      merchTxnId,
      amount: input.amount,
      customerName: input.payerName,
      customerEmail: input.payerEmail,
      customerMobile: input.payerMobile,
      returnUrl,
      callbackUrl: defaultCallbackUrl(),
    })

    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        direction: "outbound",
        requestPayload: result.raw as Prisma.InputJsonValue,
        statusCode: "INIT",
      },
    })

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PENDING },
    })

    return { payment: updated, gateway: result }
  }

  private static readonly MODES_REQUIRING_REFERENCE = new Set<PaymentMode>([
    PaymentMode.CHEQUE,
    PaymentMode.DD,
    PaymentMode.UPI_MANUAL,
  ])

  private readonly receiptSurveySelect = {
    id: true,
    surveyId: true,
    ownerName: true,
    ownerFatherName: true,
    mobile: true,
    propertyNo: true,
    parcelNo: true,
    houseNo: true,
    streetName: true,
    locality: true,
    colony: true,
    city: true,
    pincode: true,
    propertyUse: true,
    taxRateZone: true,
    roadType: true,
    wardId: true,
  } as const

  async createOffline(
    input: {
      amount: number
      paymentMode: PaymentMode
      surveyId: string
      wardId?: string
      payerName?: string
      payerMobile?: string
      receiptNumber?: string
      collectionDate?: string
      chequeDdReference?: string
      remarks?: string
    },
    user: AuthUser
  ) {
    if (input.paymentMode === PaymentMode.ONLINE) {
      throw new BadRequestException("Use online endpoint for gateway payments")
    }
    if (!input.surveyId?.trim()) {
      throw new BadRequestException({
        code: "SURVEY_REQUIRED",
        message: "Select a property/survey before recording offline payment",
      })
    }
    if (
      PaymentsService.MODES_REQUIRING_REFERENCE.has(input.paymentMode) &&
      !input.chequeDdReference?.trim()
    ) {
      throw new BadRequestException({
        code: "REFERENCE_REQUIRED",
        message:
          "Cheque / DD / UPI reference is required for this payment mode",
      })
    }

    const survey = await this.prisma.survey.findUnique({
      where: { id: input.surveyId },
      select: {
        ...this.receiptSurveySelect,
        createdById: true,
      },
    })
    if (!survey) {
      throw new NotFoundException({
        code: "SURVEY_NOT_FOUND",
        message: "Property/survey was not found",
      })
    }
    assertSurveyAccess(user, survey, "read")
    assertPaymentAccess(user, { id: "", collectedById: user.id }, "create_offline")

    const wardId = input.wardId?.trim() || survey.wardId
    const paymentReference = `OFF-${Date.now()}-${randomUUID().slice(0, 8)}`
    const receiptNumber = input.receiptNumber?.trim() || paymentReference

    let payment
    try {
      payment = await this.prisma.payment.create({
        data: {
          paymentReference,
          amount: input.amount,
          paymentMode: input.paymentMode,
          status: PaymentStatus.SUCCESS,
          surveyId: survey.id,
          wardId,
          payerName: input.payerName?.trim() || survey.ownerName,
          payerMobile: input.payerMobile?.trim() || survey.mobile,
          receiptNumber,
          collectionDate: input.collectionDate
            ? new Date(input.collectionDate)
            : new Date(),
          chequeDdReference: input.chequeDdReference?.trim() || null,
          remarks: input.remarks?.trim() || null,
          collectedById: user.id,
          refundableAmount: input.amount,
        },
        include: {
          survey: { select: this.receiptSurveySelect },
          ward: { select: { id: true, number: true, name: true, code: true } },
          collectedBy: { select: { id: true, name: true } },
        },
      })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new BadRequestException({
          code: "RECEIPT_NUMBER_EXISTS",
          message:
            "Receipt number already exists. Enter a different receipt number.",
        })
      }
      throw err
    }

    await this.audit.log({
      action: "PAYMENT_OFFLINE_CREATED",
      entity: "Payment",
      entityId: payment.id,
      actorId: user.id,
      newValue: {
        paymentReference,
        amount: input.amount,
        surveyId: survey.id,
        receiptNumber,
      },
    })

    return this.toStaffReceipt(payment)
  }

  async getStaffReceipt(paymentId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        survey: { select: this.receiptSurveySelect },
        ward: { select: { id: true, number: true, name: true, code: true } },
        collectedBy: { select: { id: true, name: true } },
      },
    })
    if (!payment) {
      throw new NotFoundException({
        code: "PAYMENT_NOT_FOUND",
        message: "Payment was not found",
      })
    }
    assertPaymentAccess(user, payment, "read")
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException({
        code: "RECEIPT_NOT_AVAILABLE",
        message: "Receipt is only available for successful payments",
      })
    }
    return this.toStaffReceipt(payment)
  }

  private toStaffReceipt(payment: {
    id: string
    paymentReference: string
    receiptNumber: string | null
    amount: Prisma.Decimal | number
    currency: string
    paymentMode: PaymentMode
    status: PaymentStatus
    payerName: string | null
    payerMobile: string | null
    chequeDdReference: string | null
    remarks: string | null
    collectionDate: Date | null
    createdAt: Date
    survey: {
      id: string
      surveyId: string
      ownerName: string | null
      ownerFatherName: string | null
      mobile: string | null
      propertyNo: string | null
      parcelNo: string | null
      houseNo: string | null
      streetName: string | null
      locality: string | null
      colony: string | null
      city: string | null
      pincode: string | null
      propertyUse: string | null
      taxRateZone: string | null
      roadType: string | null
      wardId: string
    } | null
    ward: {
      id: string
      number: number
      name: string
      code: string
    } | null
    collectedBy: { id: string; name: string } | null
  }) {
    const survey = payment.survey
    const addressParts = survey
      ? [
          survey.houseNo,
          survey.streetName,
          survey.locality,
          survey.colony,
          survey.city ?? "Nagar Panchayat Chhata",
          survey.pincode,
        ].filter(Boolean)
      : []

    return {
      paymentId: payment.id,
      paymentReference: payment.paymentReference,
      receiptNumber: payment.receiptNumber ?? payment.paymentReference,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentMode: payment.paymentMode,
      status: payment.status,
      payerName: payment.payerName,
      payerMobile: payment.payerMobile,
      chequeDdReference: payment.chequeDdReference,
      remarks: payment.remarks,
      collectionDate: (
        payment.collectionDate ?? payment.createdAt
      ).toISOString(),
      collectedBy: payment.collectedBy
        ? { id: payment.collectedBy.id, name: payment.collectedBy.name }
        : null,
      survey: survey
        ? {
            id: survey.id,
            surveyId: survey.surveyId,
            ownerName: survey.ownerName,
            ownerFatherName: survey.ownerFatherName,
            mobile: survey.mobile,
            propertyNo: survey.propertyNo,
            parcelNo: survey.parcelNo,
            houseNo: survey.houseNo,
            streetName: survey.streetName,
            locality: survey.locality,
            colony: survey.colony,
            city: survey.city,
            pincode: survey.pincode,
            propertyUse: survey.propertyUse,
            taxRateZone: survey.taxRateZone,
            roadType: survey.roadType,
            address: addressParts.length > 0 ? addressParts.join(", ") : null,
          }
        : null,
      ward: payment.ward
        ? {
            id: payment.ward.id,
            number: payment.ward.number,
            name: payment.ward.name,
            code: payment.ward.code,
          }
        : null,
    }
  }

  /**
   * Normalize Atom gateway bodies for sandbox / legacy paths.
   * Production Atom callbacks must use parseAtomEncryptedCallback instead.
   */
  normalizeGatewayPayload(
    payload: Record<string, unknown>
  ): Record<string, unknown> {
    let decoded: unknown = payload
    const encData =
      typeof payload.encData === "string" ? payload.encData.trim() : ""
    if (encData && this.provider.decryptPayload) {
      decoded = this.provider.decryptPayload(encData)
    }

    const fields = extractAtomTxnFields(decoded)
    const flatFields = extractAtomTxnFields(payload)
    const merchTxnId = fields.merchTxnId ?? flatFields.merchTxnId
    const atomTxnId = fields.atomTxnId ?? flatFields.atomTxnId
    const statusCode =
      fields.statusCode !== "UNKNOWN"
        ? fields.statusCode
        : flatFields.statusCode
    const gatewayAmount = fields.gatewayAmount ?? flatFields.gatewayAmount

    return {
      ...payload,
      ...(typeof decoded === "object" && decoded !== null
        ? (decoded as Record<string, unknown>)
        : {}),
      merchTxnId,
      atomTxnId,
      statusCode,
      gatewayAmount,
      _decoded: decoded,
    }
  }

  private parseCallbackPayload(payload: Record<string, unknown>): {
    normalized: Record<string, unknown>
    merchTxnId?: string
    atomTxnId?: string
    statusCode: string
    gatewayAmount?: number
  } {
    if (this.provider.name === "atom-ndps") {
      const parsed = parseAtomEncryptedCallback(
        payload,
        this.provider as AtomNdpsProvider
      )
      return {
        normalized: parsed.normalized,
        merchTxnId: parsed.fields.merchTxnId,
        atomTxnId: parsed.fields.atomTxnId,
        statusCode: parsed.fields.statusCode,
        gatewayAmount: parsed.fields.gatewayAmount,
      }
    }

    const normalized = this.normalizeGatewayPayload(payload)
    const fields = extractAtomTxnFields(normalized)
    return {
      normalized,
      merchTxnId:
        fields.merchTxnId ??
        (normalized.merchTxnId as string | undefined) ??
        (normalized.merchantTxnId as string | undefined),
      atomTxnId:
        fields.atomTxnId ?? (normalized.atomTxnId as string | undefined),
      statusCode: fields.statusCode,
      gatewayAmount: fields.gatewayAmount,
    }
  }

  private async rejectWebhook(
    reason: string,
    context: {
      payload: Record<string, unknown>
      merchTxnId?: string
      atomTxnId?: string
      paymentId?: string
      code: string
    }
  ) {
    await this.audit.log({
      action: "PAYMENT_WEBHOOK_REJECTED",
      entity: "Payment",
      entityId: context.paymentId,
      newValue: {
        code: context.code,
        reason,
        merchTxnId: context.merchTxnId,
        atomTxnId: context.atomTxnId,
      },
      metadata: { payload: context.payload as Prisma.InputJsonValue },
    })

    return {
      rejected: true,
      reason,
      code: context.code,
      merchTxnId: context.merchTxnId,
    }
  }

  async handleCallback(payload: Record<string, unknown>) {
    await this.audit.log({
      action: "PAYMENT_WEBHOOK_RECEIVED",
      entity: "PaymentCallback",
      newValue: {
        provider: this.provider.name,
        hasEncData:
          typeof payload.encData === "string" && payload.encData.trim().length > 0,
      },
      metadata: { payload: payload as Prisma.InputJsonValue },
    })

    let parsed: ReturnType<PaymentsService["parseCallbackPayload"]>
    try {
      parsed = this.parseCallbackPayload(payload)
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Invalid gateway callback payload"
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : "CALLBACK_PARSE_FAILED"
      return this.rejectWebhook(reason, {
        payload,
        code,
      })
    }

    const { normalized, merchTxnId, atomTxnId, statusCode, gatewayAmount } =
      parsed
    const idempotencyKey = buildPaymentCallbackIdempotencyKey({
      idempotencyKey: payload.idempotencyKey as string | undefined,
      merchTxnId,
      atomTxnId,
    })

    const existing = await this.prisma.paymentCallback.findUnique({
      where: { idempotencyKey },
    })
    if (existing?.processed) {
      return { duplicate: true, callback: existing, merchTxnId }
    }

    if (!merchTxnId) {
      return this.rejectWebhook("merchTxnId is required", {
        payload: normalized,
        atomTxnId,
        code: "MISSING_MERCH_TXN_ID",
      })
    }

    const payment = await this.prisma.payment.findFirst({
      where: { merchTxnId },
    })
    if (!payment) {
      return this.rejectWebhook("Payment not found for merchTxnId", {
        payload: normalized,
        merchTxnId,
        atomTxnId,
        code: "UNKNOWN_MERCH_TXN_ID",
      })
    }

    if (
      this.provider.name === "atom-ndps" &&
      (gatewayAmount === undefined ||
        !amountsMatchWithinTolerance(Number(payment.amount), gatewayAmount))
    ) {
      return this.rejectWebhook("Gateway amount does not match payment amount", {
        payload: normalized,
        merchTxnId,
        atomTxnId,
        paymentId: payment.id,
        code: "AMOUNT_MISMATCH",
      })
    }

    const success = isGatewaySuccess(statusCode)
    const nextStatus = success
      ? PaymentStatus.SUCCESS
      : statusCode === "UNKNOWN"
        ? payment.status
        : PaymentStatus.FAILED

    const effectiveStatus =
      payment.status === PaymentStatus.SUCCESS && !success
        ? PaymentStatus.SUCCESS
        : nextStatus

    const statusChanged = effectiveStatus !== payment.status
    const result = await this.prisma.$transaction(async (tx) => {
      const callback = await tx.paymentCallback.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          paymentId: payment.id,
          merchTxnId,
          atomTxnId,
          statusCode,
          rawPayload: normalized as Prisma.InputJsonValue,
          idempotencyKey,
          processed: false,
        },
      })

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: effectiveStatus,
          atomTxnId: atomTxnId ?? payment.atomTxnId,
          gatewayReference: atomTxnId ?? payment.gatewayReference,
          ...(success && !payment.receiptNumber
            ? {
                receiptNumber: `RCP-${payment.merchTxnId ?? payment.paymentReference}`,
                collectionDate: new Date(),
              }
            : {}),
        },
      })

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          direction: "callback",
          responsePayload: normalized as Prisma.InputJsonValue,
          statusCode,
        },
      })

      const processedCallback = await tx.paymentCallback.update({
        where: { id: callback.id },
        data: { processed: true },
      })

      return { callback: processedCallback, payment: updatedPayment }
    })

    if (success && statusChanged) {
      await this.audit.log({
        action: "PAYMENT_SUCCESS",
        entity: "Payment",
        entityId: payment.id,
        oldValue: { status: payment.status },
        newValue: {
          status: effectiveStatus,
          merchTxnId,
          atomTxnId,
          gatewayAmount,
        },
      })
    } else if (
      !success &&
      statusChanged &&
      effectiveStatus === PaymentStatus.FAILED
    ) {
      await this.audit.log({
        action: "PAYMENT_FAILED",
        entity: "Payment",
        entityId: payment.id,
        oldValue: { status: payment.status },
        newValue: {
          status: effectiveStatus,
          merchTxnId,
          atomTxnId,
          statusCode,
        },
      })
    }

    return {
      duplicate: false,
      callback: result.callback,
      merchTxnId,
      payment: result.payment,
    }
  }

  /**
   * Atom browser return: process payload like callback, then redirect citizen UI.
   */
  async handleGatewayReturn(payload: Record<string, unknown>) {
    const result = await this.handleCallback(payload)
    const merchTxnId =
      result.merchTxnId ??
      (this.normalizeGatewayPayload(payload).merchTxnId as string | undefined)
    return {
      ...result,
      redirectUrl: citizenReturnRedirectUrl(merchTxnId),
      merchTxnId,
    }
  }

  async requery(paymentId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    })
    if (!payment?.merchTxnId) throw new NotFoundException("Payment not found")
    assertPaymentAccess(user, payment, "requery")

    const result = await this.provider.requery({
      merchTxnId: payment.merchTxnId,
    })
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        direction: "requery",
        responsePayload: result.raw as Prisma.InputJsonValue,
        statusCode: result.statusCode,
      },
    })

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.success ? PaymentStatus.SUCCESS : payment.status,
        atomTxnId: result.atomTxnId ?? payment.atomTxnId,
        ...(result.success && !payment.receiptNumber
          ? {
              receiptNumber: `RCP-${payment.merchTxnId}`,
              collectionDate: payment.collectionDate ?? new Date(),
            }
          : {}),
      },
    })

    await this.audit.log({
      action: "PAYMENT_REQUERY",
      entity: "Payment",
      entityId: payment.id,
      actorId: user.id,
      newValue: { statusCode: result.statusCode },
    })

    return { payment: updated, result }
  }

  /** Public citizen return-page sync — requery gateway for PENDING payments. */
  async syncCitizenPaymentByMerchTxnId(merchTxnId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { merchTxnId },
    })
    if (!payment?.merchTxnId) {
      throw new NotFoundException({
        code: "PAYMENT_NOT_FOUND",
        message: "Payment was not found",
      })
    }

    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      return payment
    }

    const result = await this.provider.requery({
      merchTxnId: payment.merchTxnId,
    })
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        direction: "requery",
        responsePayload: result.raw as Prisma.InputJsonValue,
        statusCode: result.statusCode,
      },
    })

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.success
          ? PaymentStatus.SUCCESS
          : payment.status === PaymentStatus.PENDING
            ? PaymentStatus.PENDING
            : payment.status,
        atomTxnId: result.atomTxnId ?? payment.atomTxnId,
        ...(result.success && !payment.receiptNumber
          ? {
              receiptNumber: `RCP-${payment.merchTxnId}`,
              collectionDate: payment.collectionDate ?? new Date(),
            }
          : {}),
      },
    })
  }

  async refund(
    paymentId: string,
    amount: number,
    reason: string | undefined,
    user: AuthUser
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    })
    if (!payment) throw new NotFoundException("Payment not found")
    assertPaymentAccess(user, payment, "refund")
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException("Only successful payments can be refunded")
    }

    const refundable = Number(payment.refundableAmount ?? payment.amount)
    if (amount > refundable) {
      throw new BadRequestException("Refund amount exceeds refundable balance")
    }

    const gateway = await this.provider.refund({
      merchTxnId: payment.merchTxnId ?? payment.paymentReference,
      atomTxnId: payment.atomTxnId ?? "",
      amount,
      reason,
    })

    const refund = await this.prisma.paymentRefund.create({
      data: {
        paymentId: payment.id,
        refundReference: `RF-${Date.now()}`,
        amount,
        status: gateway.success ? "SUCCESS" : "FAILED",
        gatewayRefundId: gateway.gatewayRefundId,
        reason,
        rawResponse: gateway.raw as Prisma.InputJsonValue,
        createdById: user.id,
      },
    })

    const remaining = refundable - amount
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundableAmount: remaining,
        status:
          remaining <= 0
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED,
      },
    })

    return refund
  }

  async list(
    query: {
      page?: number
      pageSize?: number
      status?: PaymentStatus
      paymentMode?: PaymentMode
      wardId?: string
    },
    user: AuthUser
  ) {
    assertPaymentAccess(user, { id: "", collectedById: user.id }, "read")

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.wardId ? { wardId: query.wardId } : {}),
      ...(this.operatorPaymentScope(user)
        ? { collectedById: user.id }
        : {}),
    }
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          ward: true,
          survey: { select: { id: true, surveyId: true, ownerName: true } },
          collectedBy: { select: { id: true, name: true } },
        },
      }),
    ])
    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async listRefunds() {
    return this.prisma.paymentRefund.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { payment: true },
    })
  }

  async listSettlements() {
    return this.prisma.paymentSettlement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  }

  async ingestSettlement(raw: Record<string, unknown>) {
    return this.prisma.paymentSettlement.create({
      data: {
        merchTxnId: (raw.merchTxnId as string) || undefined,
        atomTxnId: (raw.atomTxnId as string) || undefined,
        amount: raw.amount != null ? Number(raw.amount) : undefined,
        status: (raw.status as string) || undefined,
        settlementUtr: (raw.utr as string) || undefined,
        settlementDate: raw.settlementDate
          ? new Date(String(raw.settlementDate))
          : undefined,
        rawPayload: raw as Prisma.InputJsonValue,
      },
    })
  }

  private operatorPaymentScope(user: AuthUser): boolean {
    return (
      user.roles.includes("OPERATOR") &&
      !user.roles.includes("SUPER_ADMIN") &&
      !user.roles.includes("DEPARTMENT_ADMIN") &&
      !user.roles.includes("CLERK")
    )
  }
}
