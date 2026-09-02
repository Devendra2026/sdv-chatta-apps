import type { INestApplication } from "@nestjs/common"
import request from "supertest"

import { CSRF_HEADER_NAME } from "../../src/common/csrf"

export function parseSetCookie(
  setCookie: string | string[] | undefined
): string {
  const lines = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  return lines.map((line) => line.split(";")[0]).join("; ")
}

export async function fetchCsrf(app: INestApplication): Promise<{
  token: string
  cookie: string
}> {
  const res = await request(app.getHttpServer()).get("/api/v1/csrf")
  const token = res.body.data.token as string
  return { token, cookie: parseSetCookie(res.headers["set-cookie"]) }
}

export async function loginWithCsrf(
  app: INestApplication,
  email: string,
  password: string
) {
  const csrf = await fetchCsrf(app)
  return request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", csrf.cookie)
    .set(CSRF_HEADER_NAME, csrf.token)
    .send({ email, password })
}
