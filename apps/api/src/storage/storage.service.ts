import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common"
import { createHmac, timingSafeEqual } from "node:crypto"
import { createReadStream, existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Readable } from "node:stream"

const MIME_BY_EXT: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private root = path.resolve(process.env.STORAGE_DIR ?? "uploads")

  onModuleInit() {
    this.root = path.resolve(process.env.STORAGE_DIR ?? "uploads")
    this.logger.log(`Local file storage at ${this.root}`)
  }

  async ensureBucket() {
    await mkdir(this.root, { recursive: true })
  }

  async putObject(
    objectKey: string,
    buffer: Buffer,
    _mimeType?: string
  ): Promise<string> {
    await this.ensureBucket()
    const filePath = this.resolveObjectPath(objectKey)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, buffer)
    return objectKey
  }

  async getObject(objectKey: string): Promise<Buffer> {
    const stream = this.createObjectStream(objectKey)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  createObjectStream(objectKey: string): Readable {
    const filePath = this.resolveObjectPath(objectKey)
    if (!existsSync(filePath)) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: "File not found",
      })
    }
    return createReadStream(filePath)
  }

  guessMime(objectKey: string): string {
    return (
      MIME_BY_EXT[path.extname(objectKey).toLowerCase()] ??
      "application/octet-stream"
    )
  }

  async getSignedUrl(objectKey: string, expirySeconds = 300): Promise<string> {
    this.resolveObjectPath(objectKey)
    const exp = Math.floor(Date.now() / 1000) + expirySeconds
    const sig = this.sign(objectKey, exp)
    const params = new URLSearchParams({
      key: objectKey,
      exp: String(exp),
      sig,
    })
    return `/api/v1/files?${params.toString()}`
  }

  assertDownloadSignature(objectKey: string, expRaw: string, sig: string) {
    const exp = Number(expRaw)
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException({
        code: "FILE_URL_EXPIRED",
        message: "File link expired",
      })
    }
    const expected = this.sign(objectKey, exp)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException({
        code: "FILE_URL_INVALID",
        message: "Invalid file link",
      })
    }
    this.resolveObjectPath(objectKey)
  }

  private sign(objectKey: string, exp: number): string {
    return createHmac("sha256", this.signingSecret())
      .update(`${objectKey}.${exp}`)
      .digest("hex")
  }

  private signingSecret(): string {
    return (
      process.env.STORAGE_SIGNING_SECRET?.trim() ||
      process.env.SESSION_SECRET?.trim() ||
      process.env.BETTER_AUTH_SECRET?.trim() ||
      "dev-storage-signing-secret"
    )
  }

  resolveObjectPath(objectKey: string): string {
    const normalized = objectKey.replaceAll("\\", "/").replace(/^\/+/, "")
    if (!normalized || normalized.includes("..")) {
      throw new BadRequestException({
        code: "INVALID_OBJECT_KEY",
        message: "Invalid object key",
      })
    }
    const full = path.resolve(this.root, normalized)
    const rootWithSep = this.root.endsWith(path.sep)
      ? this.root
      : `${this.root}${path.sep}`
    if (full !== this.root && !full.startsWith(rootWithSep)) {
      throw new BadRequestException({
        code: "INVALID_OBJECT_KEY",
        message: "Invalid object key",
      })
    }
    return full
  }
}
