import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { DuplicateStrategy } from "@prisma/client"
import type { Response } from "express"

import {
  CurrentUser,
  RequirePermission,
  type AuthUser,
} from "../auth/auth.decorators"
import { ImportsService } from "./imports.service"

function assertImportReadOrCreate(user: AuthUser | undefined) {
  if (!user) {
    throw new ForbiddenException({
      code: "FORBIDDEN",
      message: "Permission denied",
    })
  }
  if (user.roles.includes("SUPER_ADMIN")) return
  if (
    user.permissions.includes("import:read") ||
    user.permissions.includes("import:create")
  ) {
    return
  }
  throw new ForbiddenException({
    code: "FORBIDDEN",
    message: "Missing permission: import:read or import:create",
  })
}

@Controller("api/v1/imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("upload")
  @RequirePermission("import:create")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Body("duplicateStrategy") duplicateStrategy?: DuplicateStrategy
  ) {
    const data = await this.importsService.createUpload(
      file,
      user,
      duplicateStrategy ?? "UPDATE"
    )
    return { success: true, data }
  }

  @Get(":id/preview")
  async previewGet(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    assertImportReadOrCreate(user)
    const data = await this.importsService.preview(id)
    return { success: true, data }
  }

  @Post(":id/preview")
  async previewPost(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser
  ) {
    assertImportReadOrCreate(user)
    const data = await this.importsService.preview(id)
    return { success: true, data }
  }

  @Post(":id/start")
  @RequirePermission("import:create")
  async start(
    @Param("id") id: string,
    @Body() body?: { pruneMissing?: boolean }
  ) {
    const data = await this.importsService.start(id, {
      pruneMissing: body?.pruneMissing === true,
    })
    return { success: true, data }
  }

  @Get(":id/errors.xlsx")
  @RequirePermission("import:read")
  async downloadErrors(@Param("id") id: string, @Res() res: Response) {
    const { buffer, fileName } =
      await this.importsService.buildErrorsWorkbook(id)
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    )
    res.send(buffer)
  }

  @Get()
  @RequirePermission("import:read")
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("q") q?: string
  ) {
    const { items, meta } = await this.importsService.list(
      Number(page ?? 1),
      Number(pageSize ?? 20),
      { status, q }
    )
    return { success: true, data: items, meta }
  }

  @Get(":id")
  @RequirePermission("import:read")
  async get(@Param("id") id: string) {
    const data = await this.importsService.getJob(id)
    return { success: true, data }
  }
}

@Controller("api/v1/exports")
export class ExportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("surveys")
  @RequirePermission("export:create")
  async exportSurveys(
    @Body() body: { wardId?: string; status?: string },
    @CurrentUser() user: AuthUser
  ) {
    const data = await this.importsService.exportSurveys(body, user)
    return { success: true, data }
  }
}
