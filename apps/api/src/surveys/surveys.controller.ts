import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { AuthGuard } from "../auth/auth.guard"
import { PermissionGuard } from "../auth/permission.guard"
import {
  CreateSurveyDto,
  ListSurveysQueryDto,
  UpdateSurveyDto,
} from "./dto/survey.dto"
import { SurveysService } from "./surveys.service"

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

@Controller("api/v1/surveys")
@UseGuards(AuthGuard, PermissionGuard)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @RequirePermission("survey:create")
  async create(@Body() dto: CreateSurveyDto, @CurrentUser() user: AuthUser) {
    const data = await this.surveysService.create(dto, user)
    return { success: true, data }
  }

  @Get()
  @RequirePermission("survey:read")
  async findAll(@Query() query: ListSurveysQueryDto) {
    const { items, meta } = await this.surveysService.findAll(query)
    return { success: true, data: items, meta }
  }

  @Get(":id")
  @RequirePermission("survey:read")
  async findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const survey = await this.surveysService.findOne(id)
    const masked = this.surveysService.maskPii(
      survey,
      user.permissions.includes("survey:pii:read") ||
        user.roles.includes("SUPER_ADMIN")
    )
    const data = await this.surveysService.withAttachmentUrls(masked)
    return { success: true, data }
  }

  @Post(":id/attachments")
  @RequirePermission("survey:update")
  @UseInterceptors(FileInterceptor("file"))
  async uploadAttachment(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser
  ) {
    if (!file) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "Image or PDF file is required",
      })
    }
    if (!IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: "INVALID_FILE_TYPE",
        message: "Only JPEG, PNG, WebP, GIF, or PDF allowed",
      })
    }
    const maxMb = Number(process.env.IMPORT_MAX_FILE_SIZE_MB ?? 50)
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `File must be under ${maxMb}MB`,
      })
    }
    const data = await this.surveysService.addAttachment(id, file, user)
    return { success: true, data }
  }

  @Delete(":id/attachments/:attachmentId")
  @RequirePermission("survey:update")
  async removeAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string
  ) {
    const data = await this.surveysService.removeAttachment(id, attachmentId)
    return { success: true, data }
  }

  @Patch(":id")
  @RequirePermission("survey:update")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.surveysService.update(id, dto, user)
    return { success: true, data }
  }

  @Delete(":id")
  @RequirePermission("survey:delete")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const data = await this.surveysService.remove(id, user)
    return { success: true, data }
  }
}
