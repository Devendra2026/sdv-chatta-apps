import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
} from "@nestjs/common"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { DemandsService } from "./demands.service"
import {
  GetDemandQueryDto,
  GetPublishedDemandQueryDto,
  ListDemandsQueryDto,
  PublishDemandDto,
  PublishWardDemandsDto,
  YearEndDto,
} from "./dto/demand.dto"

@Controller("api/v1/demands")
export class DemandsController {
  constructor(private readonly demands: DemandsService) {}

  @Get("published")
  async getPublished(
    @Query() query: GetPublishedDemandQueryDto,
    @CurrentUser() user: AuthUser
  ) {
    this.assertReadAccess(user)
    const data = await this.demands.getPublishedForSurvey(
      query.surveyId,
      query.assessmentYearId
    )
    return { success: true, data }
  }

  @Get("outstanding")
  async listOutstanding(
    @Query() query: ListDemandsQueryDto,
    @CurrentUser() user: AuthUser
  ) {
    this.assertReadAccess(user)
    const { items, meta } = await this.demands.listDemands({
      page: query.page,
      pageSize: query.pageSize,
      wardId: query.wardId,
      assessmentYearId: query.assessmentYearId,
      search: query.search,
      outstandingOnly: true,
      status: "PUBLISHED",
    })
    return { success: true, data: items, meta }
  }

  @Get("ledger")
  async customerLedger(
    @Query("surveyId") surveyId: string,
    @CurrentUser() user: AuthUser
  ) {
    this.assertReadAccess(user)
    if (!surveyId?.trim()) {
      return {
        success: false,
        error: { code: "SURVEY_REQUIRED", message: "surveyId is required" },
      }
    }
    const data = await this.demands.getCustomerLedger(surveyId.trim())
    return { success: true, data }
  }

  @Get("list")
  async list(
    @Query() query: ListDemandsQueryDto,
    @CurrentUser() user: AuthUser
  ) {
    this.assertReadAccess(user)
    const { items, meta } = await this.demands.listDemands({
      page: query.page,
      pageSize: query.pageSize,
      wardId: query.wardId,
      assessmentYearId: query.assessmentYearId,
      surveyId: query.surveyId,
      search: query.search,
      status: query.status,
      outstandingOnly: query.outstandingOnly === "true",
    })
    return { success: true, data: items, meta }
  }

  @Get()
  async get(
    @Query() query: GetDemandQueryDto,
    @CurrentUser() user: AuthUser
  ) {
    this.assertReadAccess(user)
    const data = await this.demands.getBySurveyAndYear(
      query.surveyId,
      query.assessmentYearId
    )
    return { success: true, data }
  }

  @Post("publish")
  @RequirePermission("settings:update")
  async publish(
    @Body() dto: PublishDemandDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.demands.publish(dto, user.id)
    return { success: true, data }
  }

  @Post("publish-ward")
  @RequirePermission("settings:update")
  async publishWard(
    @Body() dto: PublishWardDemandsDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.demands.publishForWard(
      dto.wardId,
      dto.assessmentYearId,
      user.id
    )
    return { success: true, data }
  }

  @Post("year-end/preview")
  @RequirePermission("payment:read")
  async yearEndPreview(@Body() dto: YearEndDto, @CurrentUser() user: AuthUser) {
    this.assertReadAccess(user)
    const data = await this.demands.previewYearEnd(
      dto.fromYearId,
      dto.toYearId
    )
    return { success: true, data }
  }

  @Post("year-end/commit")
  @RequirePermission("settings:update")
  async yearEndCommit(
    @Body() dto: YearEndDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.demands.commitYearEnd(
      dto.fromYearId,
      dto.toYearId,
      user.id
    )
    return { success: true, data }
  }

  private assertReadAccess(user: AuthUser) {
    if (user.roles.includes("SUPER_ADMIN")) return
    const ok =
      user.permissions.includes("payment:read") ||
      user.permissions.includes("report:read")
    if (!ok) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Missing permission: payment:read or report:read",
      })
    }
  }
}
