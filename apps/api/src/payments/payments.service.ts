import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { PaymentMode, PaymentStatus, Prisma } from "@prisma/client"
import { randomUUID } from "node:crypto"

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"
import { AtomNdpsProvider } from "./providers/atom-ndps.provider"
import type { PaymentGatewayProvider } from "./providers/payment-provider"
import { SandboxPaymentProvider } from "./providers/sandbox.provider"

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
    return this.createOnlinePayment(input, user.id)
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

    const returnUrl =
      process.env.ATOM_RETURN_URL ??
      "http://localhost:3001/propertytax/payment/return"
    const result = await this.provider.createPayment({
      merchTxnId,
      amount: input.amount,
      customerName: input.payerName,
      customerEmail: input.payerEmail,
      customerMobile: input.payerMobile,
      returnUrl,
      callbackUrl:
        process.env.ATOM_CALLBACK_URL ??
        "http://localhost:4000/api/v1/payments/gateway/callback",
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

  async createOffline(
    input: {
      amount: number
      paymentMode: PaymentMode
      surveyId?: string
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
    const paymentReference = `OFF-${Date.now()}-${randomUUID().slice(0, 8)}`
    const payment = await this.prisma.payment.create({
      data: {
        paymentReference,
        amount: input.amount,
        paymentMode: input.paymentMode,
        status: PaymentStatus.SUCCESS,
        surveyId: input.surveyId,
        wardId: input.wardId,
        payerName: input.payerName,
        payerMobile: input.payerMobile,
        receiptNumber: input.receiptNumber ?? paymentReference,
        collectionDate: input.collectionDate
          ? new Date(input.collectionDate)
          : new Date(),
        chequeDdReference: input.chequeDdReference,
        remarks: input.remarks,
        collectedById: user.id,
        refundableAmount: input.amount,
      },
    })

    await this.audit.log({
      action: "PAYMENT_OFFLINE_CREATED",
      entity: "Payment",
      entityId: payment.id,
      actorId: user.id,
      newValue: { paymentReference, amount: input.amount },
    })

    return payment
  }

  async handleCallback(payload: Record<string, unknown>) {
    const merchTxnId =
      (payload.merchTxnId as string | undefined) ||
      (payload.merchantTxnId as string | undefined) ||
      undefined
    const atomTxnId = (payload.atomTxnId as string | undefined) || undefined
    const statusCode = (payload.statusCode as string | undefined) || "UNKNOWN"
    const idempotencyKey =
      (payload.idempotencyKey as string | undefined) ||
      `${merchTxnId ?? "na"}:${atomTxnId ?? "na"}:${statusCode}`

    const existing = await this.prisma.paymentCallback.findUnique({
      where: { idempotencyKey },
    })
    if (existing?.processed) {
      return { duplicate: true, callback: existing }
    }

    const payment = merchTxnId
      ? await this.prisma.payment.findFirst({ where: { merchTxnId } })
      : null

    const callback = await this.prisma.paymentCallback.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        paymentId: payment?.id,
        merchTxnId,
        atomTxnId,
        statusCode,
        rawPayload: payload as Prisma.InputJsonValue,
        idempotencyKey,
        processed: false,
      },
    })

    if (payment) {
      const success = statusCode === "OTS0000" || statusCode === "SUCCESS"
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
          atomTxnId: atomTxnId ?? payment.atomTxnId,
          gatewayReference: atomTxnId,
          ...(success && !payment.receiptNumber
            ? {
                receiptNumber: `RCP-${payment.merchTxnId ?? payment.paymentReference}`,
                collectionDate: new Date(),
              }
            : {}),
        },
      })
      await this.prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          direction: "callback",
          responsePayload: payload as Prisma.InputJsonValue,
          statusCode,
        },
      })
    }

    const updated = await this.prisma.paymentCallback.update({
      where: { id: callback.id },
      data: { processed: true },
    })

    return { duplicate: false, callback: updated }
  }

  async requery(paymentId: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    })
    if (!payment?.merchTxnId) throw new NotFoundException("Payment not found")

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

  async list(query: {
    page?: number
    pageSize?: number
    status?: PaymentStatus
    paymentMode?: PaymentMode
    wardId?: string
  }) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.wardId ? { wardId: query.wardId } : {}),
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
}
