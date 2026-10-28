import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import {
  CreateTaxAdjustmentDto,
  ListTaxAdjustmentsQueryDto,
  UpdateTaxAdjustmentDto,
} from "./dto/tax-adjustment.dto"
import { TaxAdjustmentsService } from "./tax-adjustments.service"

@Controller("api/v1/tax-adjustments")
export class TaxAdjustmentsController {
  constructor(private readonly taxAdjustments: TaxAdjustmentsService) {}

  @Get()
  @RequirePermission("report:read")
  async list(@Query() query: ListTaxAdjustmentsQueryDto) {
    const data = await this.taxAdjustments.list(query)
    return { success: true, data }
  }

  @Get(":id")
  @RequirePermission("report:read")
  async get(@Param("id") id: string) {
    const data = await this.taxAdjustments.getById(id)
    return { success: true, data }
  }

  @Post()
  @RequirePermission("settings:update")
  async create(
    @Body() dto: CreateTaxAdjustmentDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.taxAdjustments.create(dto, user.id)
    return { success: true, data }
  }

  @Patch(":id")
  @RequirePermission("settings:update")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaxAdjustmentDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.taxAdjustments.update(id, dto, user.id)
    return { success: true, data }
  }

  @Post(":id/publish")
  @RequirePermission("settings:update")
  async publish(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.taxAdjustments.publish(id, user.id)
    return { success: true, data }
  }

  @Post(":id/archive")
  @RequirePermission("settings:update")
  async archive(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.taxAdjustments.archive(id, user.id)
    return { success: true, data }
  }

  @Delete(":id")
  @RequirePermission("settings:update")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.taxAdjustments.remove(id, user.id)
    return { success: true, data }
  }
}
