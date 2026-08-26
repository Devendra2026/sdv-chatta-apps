import { Logger, ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import "dotenv/config"
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"

import { AppModule } from "./app.module"
import { AllExceptionsFilter } from "./common/all-exceptions.filter"
import { RateLimitMiddleware } from "./common/rate-limit.middleware"
import { RequestLoggingInterceptor } from "./common/request-logging.interceptor"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  })

  // Better Auth must receive the raw body; JSON + urlencoded for everything else.
  // Atom gateway callback/return often posts application/x-www-form-urlencoded.
  const bodyLimit = process.env.REQUEST_BODY_LIMIT ?? "25mb"
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith("/api/auth")) {
      return next()
    }
    return express.json({ limit: bodyLimit })(req, res, (err?: unknown) => {
      if (err) return next(err as Error)
      return express.urlencoded({ extended: true, limit: bodyLimit })(
        req,
        res,
        next
      )
    })
  })

  app.use(new RateLimitMiddleware().use.bind(new RateLimitMiddleware()))

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("Referrer-Policy", "no-referrer")
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    )
    next()
  })

  app.enableShutdownHooks()
  app.useGlobalInterceptors(new RequestLoggingInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000"
  app.enableCors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  })

  const port = process.env.PORT ? Number(process.env.PORT) : 4000
  await app.listen(port)
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap")
}

bootstrap()
