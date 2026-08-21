import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import { PaymentMode, PaymentStatus } from "@prisma/client"
import { Type } from "class-transformer"
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
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

class CreateOfflineDto extends CreateOnlineDto {
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode

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
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("payment:create")
  async createOnline(@Body() dto: CreateOnlineDto, @CurrentUser() user: AuthUser) {
    const data = await this.paymentsService.createOnline(dto, user)
    return { success: true, data }
  }

  @Post("offline")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("payment:offline:create")
  async createOffline(@Body() dto: CreateOfflineDto, @CurrentUser() user: AuthUser) {
    const data = await this.paymentsService.createOffline(dto, user)
    return { success: true, data }
  }

  @Post("gateway/callback")
  async callback(@Body() body: Record<string, unknown>) {
    const data = await this.paymentsService.handleCallback(body)
    return { success: true, data }
  }

  @Post(":id/requery")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("payment:requery")
  async requery(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.paymentsService.requery(id, user)
    return { success: true, data }
  }

  @Post(":id/refund")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("refund:create")
  async refund(
    @Param("id") id: string,
    @Body() body: { amount: number; reason?: string },
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.paymentsService.refund(id, body.amount, body.reason, user)
    return { success: true, data }
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("payment:read")
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: PaymentStatus,
    @Query("paymentMode") paymentMode?: PaymentMode,
    @Query("wardId") wardId?: string
  ) {
    const { items, meta } = await this.paymentsService.list({
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20),
      status,
      paymentMode,
      wardId,
    })
    return { success: true, data: items, meta }
  }

  @Get("refunds")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("refund:read")
  async refunds() {
    const data = await this.paymentsService.listRefunds()
    return { success: true, data }
  }

  @Get("settlements")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("settlement:read")
  async settlements() {
    const data = await this.paymentsService.listSettlements()
    return { success: true, data }
  }

  @Post("settlements/ingest")
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermission("settlement:read")
  async ingestSettlement(@Body() body: Record<string, unknown>) {
    const data = await this.paymentsService.ingestSettlement(body)
    return { success: true, data }
  }
}
