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
import { PrismaService } from "../prisma/prisma.service"
import {
  CreateAssessmentYearDto,
  UpdateAssessmentYearDto,
} from "./dto/assessment-year.dto"
import { ReferenceService } from "./reference.service"

@Controller("api/v1/reference-entries")
export class ReferenceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceService: ReferenceService
  ) {}

  @Get("categories")
  @RequirePermission("report:read")
  async categories() {
    const rows = await this.prisma.referenceCategory.findMany({
      orderBy: { sortOrder: "asc" },
    })
    return { success: true, data: rows }
  }

  @Get()
  @RequirePermission("report:read")
  async list(
    @Query("category") category?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE" | "ALL"
  ) {
    const statusFilter =
      status === "ALL"
        ? undefined
        : status === "ACTIVE" || status === "INACTIVE"
          ? status
          : "ACTIVE"
    const entries = await this.prisma.referenceEntry.findMany({
      where: {
        ...(category ? { category: { code: category } } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    })

    return { success: true, data: entries }
  }

  @Post("assessment-years")
  @RequirePermission("settings:update")
  async createAssessmentYear(
    @Body() dto: CreateAssessmentYearDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.referenceService.createAssessmentYear(dto, user.id)
    return { success: true, data }
  }

  @Patch("assessment-years/:id")
  @RequirePermission("settings:update")
  async updateAssessmentYear(
    @Param("id") id: string,
    @Body() dto: UpdateAssessmentYearDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.referenceService.updateAssessmentYear(
      id,
      dto,
      user.id
    )
    return { success: true, data }
  }

  @Patch("assessment-years/:id/activate")
  @RequirePermission("settings:update")
  async activateAssessmentYear(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.referenceService.activateAssessmentYear(id, user.id)
    return { success: true, data }
  }

  @Patch("assessment-years/:id/deactivate")
  @RequirePermission("settings:update")
  async deactivateAssessmentYear(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.referenceService.deactivateAssessmentYear(
      id,
      user.id
    )
    return { success: true, data }
  }

  @Delete("assessment-years/:id")
  @RequirePermission("settings:update")
  async deleteAssessmentYear(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.referenceService.deleteAssessmentYear(id, user.id)
    return { success: true, data }
  }
}
