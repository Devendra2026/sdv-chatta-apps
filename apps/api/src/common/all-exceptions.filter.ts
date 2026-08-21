import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import type { Request, Response } from "express"

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions")

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request & { requestId?: string }>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    let code = "INTERNAL_ERROR"
    let message = "An unexpected error occurred"

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === "object" &&
      "message" in exceptionResponse
    ) {
      const raw = (exceptionResponse as { message?: string | string[]; error?: string })
        .message
      message = Array.isArray(raw) ? raw.join(", ") : (raw ?? message)
      if (
        "error" in exceptionResponse &&
        typeof (exceptionResponse as { error?: string }).error === "string"
      ) {
        code = (exceptionResponse as { error: string }).error
          .toUpperCase()
          .replace(/\s+/g, "_")
      }
    } else if (exception instanceof Error) {
      message =
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? "An unexpected error occurred"
          : exception.message
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === "object" &&
      "code" in exceptionResponse &&
      typeof (exceptionResponse as { code?: string }).code === "string"
    ) {
      code = (exceptionResponse as { code: string }).code
    }

    this.logger.error(
      `${request.method} ${request.url} status=${status} code=${code} requestId=${request.requestId ?? "-"} message=${message}`
    )

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        requestId: request.requestId,
      },
    })
  }
}
