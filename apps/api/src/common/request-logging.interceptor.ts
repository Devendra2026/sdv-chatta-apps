import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { Observable, tap } from "rxjs"

import type { Request, Response } from "express"

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP")

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const req = http.getRequest<Request & { requestId?: string }>()
    const res = http.getResponse<Response>()

    const requestId =
      (typeof req.headers["x-request-id"] === "string" &&
        req.headers["x-request-id"]) ||
      randomUUID()

    req.requestId = requestId
    res.setHeader("x-request-id", requestId)

    const started = Date.now()
    const { method, originalUrl } = req

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${originalUrl} ${res.statusCode} ${Date.now() - started}ms requestId=${requestId}`
          )
        },
        error: (err: Error) => {
          this.logger.error(
            `${method} ${originalUrl} failed ${Date.now() - started}ms requestId=${requestId} message=${err.message}`
          )
        },
      })
    )
  }
}
