import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common"
import { PaymentMode, PaymentStatus } from "@prisma/client"
import { Type } from "class-transformer"
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator"
import type { Response } from "express"

import {
  CurrentUser,
  Public,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { PaymentsService } from "./payments.service"

class CreateOnlineDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number

  @IsOptional()
  @IsString()
  surveyId?: string

  @IsOptional()
  @IsString()
  wardId?: string

  @IsOptional()
  @IsString()
  payerName?: string

  @IsOptional()
  @IsString()
  payerMobile?: string

  @IsOptional()
  @IsString()
  payerEmail?: string
}

class CreateOfflineDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode

  @IsString()
  @IsNotEmpty()
  surveyId!: string

  @IsOptional()
  @IsString()
  wardId?: string

  @IsOptional()
  @IsString()
  payerName?: string

  @IsOptional()
  @IsString()
  payerMobile?: string

  @IsOptional()
  @IsString()
  receiptNumber?: string

  @IsOptional()
  @IsString()
  collectionDate?: string

  @IsOptional()
  @IsString()
  chequeDdReference?: string

  @IsOptional()
  @IsString()
  remarks?: string
}

@Controller("api/v1/payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("online")
  @RequirePermission("payment:create")
  async createOnline(
    @Body() dto: CreateOnlineDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.paymentsService.createOnline(dto, user)
    return { success: true, data }
  }

  @Post("offline")
  @RequirePermission("payment:offline:create")
  async createOffline(
    @Body() dto: CreateOfflineDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.paymentsService.createOffline(dto, user)
    return { success: true, data }
  }

  @Public()
  @Post("gateway/callback")
  async callback(@Body() body: Record<string, unknown>) {
    const data = await this.paymentsService.handleCallback(body ?? {})
    return { success: true, data }
  }

  /** Atom (or sandbox) browser return — process payload and 302 to citizen web. */
  @Public()
  @Post("gateway/return")
  async gatewayReturnPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response
  ) {
    const payload = { ...query, ...(body ?? {}) }
    const data = await this.paymentsService.handleGatewayReturn(payload)
    return res.redirect(302, data.redirectUrl)
  }

  @Public()
  @Get("gateway/return")
  async gatewayReturnGet(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response
  ) {
    const data = await this.paymentsService.handleGatewayReturn({ ...query })
    return res.redirect(302, data.redirectUrl)
  }

  @Post(":id/requery")
  @RequirePermission("payment:requery")
  async requery(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.paymentsService.requery(id, user)
    return { success: true, data }
  }

  @Post(":id/refund")
  @RequirePermission("refund:create")
  async refund(
    @Param("id") id: string,
    @Body() body: { amount: number; reason?: string },
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.paymentsService.refund(
      id,
      body.amount,
      body.reason,
      user
    )
    return { success: true, data }
  }

  @Get()
  @RequirePermission("payment:read")
  async list(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: PaymentStatus,
    @Query("paymentMode") paymentMode?: PaymentMode,
    @Query("wardId") wardId?: string
  ) {
    const { items, meta } = await this.paymentsService.list(
      {
        page: Number(page ?? 1),
        pageSize: Number(pageSize ?? 20),
        status,
        paymentMode,
        wardId,
      },
      user
    )
    return { success: true, data: items, meta }
  }

  @Get("refunds")
  @RequirePermission("refund:read")
  async refunds() {
    const data = await this.paymentsService.listRefunds()
    return { success: true, data }
  }

  @Get("settlements")
  @RequirePermission("settlement:read")
  async settlements() {
    const data = await this.paymentsService.listSettlements()
    return { success: true, data }
  }

  @Get(":id/receipt")
  @RequirePermission("payment:read")
  async staffReceipt(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.paymentsService.getStaffReceipt(id, user)
    return { success: true, data }
  }

  @Post("settlements/ingest")
  @RequirePermission("settlement:read")
  async ingestSettlement(@Body() body: Record<string, unknown>) {
    const data = await this.paymentsService.ingestSettlement(body)
    return { success: true, data }
  }
}
