import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"

import { Public } from "../auth/auth.decorators"
import { CreatePublicPropertyTaxPaymentDto } from "./dto/create-public-payment.dto"
import { PublicPropertyTaxSearchQueryDto } from "./dto/public-property-tax.dto"
import { PublicPropertyTaxService } from "./public-property-tax.service"

@Public()
@Controller("api/v1/public/property-tax")
export class PublicPropertyTaxController {
  constructor(private readonly service: PublicPropertyTaxService) {}

  @Get("wards")
  async listWards() {
    const wards = await this.service.listWards()
    return { success: true, data: wards }
  }

  @Get("search")
  async search(@Query() query: PublicPropertyTaxSearchQueryDto) {
    const data = await this.service.search(query)
    return { success: true, data }
  }

  @Get("dues/:id")
  async getDues(@Param("id") id: string) {
    const data = await this.service.getDues(id)
    return { success: true, data }
  }

  @Post("payments")
  async createPayment(@Body() body: CreatePublicPropertyTaxPaymentDto) {
    const data = await this.service.createPayment(body)
    return { success: true, data }
  }

  @Get("payments/by-merch/:merchTxnId")
  async getPaymentByMerch(
    @Param("merchTxnId") merchTxnId: string,
    @Query("sync") sync?: string
  ) {
    const data = await this.service.getPaymentByMerchTxnId(
      merchTxnId,
      sync === "1" || sync === "true"
    )
    return { success: true, data }
  }

  @Get("receipts/:merchTxnId")
  async getReceipt(@Param("merchTxnId") merchTxnId: string) {
    const data = await this.service.getReceipt(merchTxnId)
    return { success: true, data }
  }
}
