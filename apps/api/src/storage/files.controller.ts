import { Controller, Get, Query, StreamableFile } from "@nestjs/common"
import { IsNotEmpty, IsString } from "class-validator"
import path from "node:path"

import { Public } from "../auth/auth.decorators"
import { StorageService } from "./storage.service"

class FileDownloadQueryDto {
  @IsString()
  @IsNotEmpty()
  key!: string

  @IsString()
  @IsNotEmpty()
  exp!: string

  @IsString()
  @IsNotEmpty()
  sig!: string
}

@Public()
@Controller("api/v1/files")
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Signed download endpoint. Object ownership is enforced when staff services
   * mint URLs via StorageService.getSignedUrlForUser (assertFileAccess).
   */
  @Get()
  download(@Query() query: FileDownloadQueryDto): StreamableFile {
    this.storage.assertDownloadSignature(query.key, query.exp, query.sig)
    const filename = path.basename(query.key) || "download"
    return new StreamableFile(this.storage.createObjectStream(query.key), {
      type: this.storage.guessMime(query.key),
      disposition: `inline; filename="${filename.replaceAll('"', "")}"`,
    })
  }
}
