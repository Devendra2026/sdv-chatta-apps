import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import * as Minio from "minio"

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private client!: Minio.Client
  private signingClient!: Minio.Client
  private bucket = process.env.MINIO_BUCKET ?? "chhata-surveys"

  onModuleInit() {
    const accessKey = process.env.MINIO_ACCESS_KEY ?? "minioadmin"
    const secretKey = process.env.MINIO_SECRET_KEY ?? "minioadmin"
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
    })
    const publicHost = process.env.MINIO_PUBLIC_ENDPOINT?.trim()
    this.signingClient = publicHost
      ? new Minio.Client({
          endPoint: publicHost,
          port: Number(process.env.MINIO_PUBLIC_PORT ?? 443),
          useSSL: process.env.MINIO_PUBLIC_USE_SSL !== "false",
          accessKey,
          secretKey,
        })
      : this.client
  }

  async ensureBucket() {
    const exists = await this.client
      .bucketExists(this.bucket)
      .catch(() => false)
    if (!exists) {
      await this.client.makeBucket(this.bucket, "us-east-1")
      this.logger.log(`Created bucket ${this.bucket}`)
    }
  }

  async putObject(
    objectKey: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    await this.ensureBucket()
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      "Content-Type": mimeType,
    })
    return objectKey
  }

  async getObject(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async getSignedUrl(objectKey: string, expirySeconds = 300): Promise<string> {
    return this.signingClient.presignedGetObject(
      this.bucket,
      objectKey,
      expirySeconds
    )
  }
}
