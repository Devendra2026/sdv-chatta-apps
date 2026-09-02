import { Injectable, NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"

import { resolveTrustedOrigins } from "../auth/session-options"
import { isMutatingMethod } from "./csrf"

const JSON_CONTENT_TYPES = new Set([
  "application/json",
  "application/json; charset=utf-8",
])

@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!isMutatingMethod(req.method)) {
      next()
      return
    }

    const contentType = req.headers["content-type"]?.split(";")[0]?.trim()
    if (
      contentType &&
      !JSON_CONTENT_TYPES.has(contentType) &&
      !contentType.startsWith("multipart/form-data")
    ) {
      res.status(415).json({
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Unsupported Content-Type",
        },
      })
      return
    }

    const originHeader = req.headers.origin?.trim()
    const refererHeader = req.headers.referer?.trim()
    const trusted = resolveTrustedOrigins()

    const originFromReferer = refererHeader
      ? (() => {
          try {
            const url = new URL(refererHeader)
            return `${url.protocol}//${url.host}`
          } catch {
            return undefined
          }
        })()
      : undefined

    const candidate = originHeader || originFromReferer
    if (candidate && !trusted.includes(candidate.replace(/\/+$/, ""))) {
      res.status(403).json({
        success: false,
        error: {
          code: "INVALID_ORIGIN",
          message: "Request origin is not allowed",
        },
      })
      return
    }

    next()
  }
}
