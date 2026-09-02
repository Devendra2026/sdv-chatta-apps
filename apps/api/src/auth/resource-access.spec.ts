import { ForbiddenException } from "@nestjs/common"

import type { AuthUser } from "./auth.decorators"
import {
  assertFileAccess,
  assertPaymentAccess,
  assertSurveyAccess,
  parseSurveyIdFromObjectKey,
} from "./resource-access"

const clerk: AuthUser = {
  id: "clerk-1",
  email: "clerk@example.com",
  name: "Clerk",
  status: "ACTIVE",
  roles: ["CLERK"],
  permissions: [
    "survey:read",
    "survey:update",
    "payment:read",
    "file:read",
    "file:create",
  ],
}

const operator: AuthUser = {
  id: "op-1",
  email: "op@example.com",
  name: "Operator",
  status: "ACTIVE",
  roles: ["OPERATOR"],
  permissions: [
    "survey:read",
    "survey:create",
    "survey:update",
    "payment:read",
    "payment:offline:create",
    "file:read",
    "file:create",
  ],
}

describe("resource-access", () => {
  it("parses survey id from object keys", () => {
    expect(parseSurveyIdFromObjectKey("surveys/abc123/file.pdf")).toBe("abc123")
    expect(parseSurveyIdFromObjectKey("imports/x.xlsx")).toBeNull()
  })

  it("allows clerk to update any survey", () => {
    expect(() =>
      assertSurveyAccess(
        clerk,
        { id: "s1", wardId: "w1", createdById: "other" },
        "update"
      )
    ).not.toThrow()
  })

  it("blocks operator from updating another user's survey", () => {
    expect(() =>
      assertSurveyAccess(
        operator,
        { id: "s1", wardId: "w1", createdById: "other" },
        "update"
      )
    ).toThrow(ForbiddenException)
  })

  it("allows operator to read citizen payments", () => {
    expect(() =>
      assertPaymentAccess(
        operator,
        { id: "p1", collectedById: null },
        "read"
      )
    ).not.toThrow()
  })

  it("blocks operator from reading another collector's payment", () => {
    expect(() =>
      assertPaymentAccess(
        operator,
        { id: "p1", collectedById: "other" },
        "read"
      )
    ).toThrow(ForbiddenException)
  })

  it("blocks operator from reading another user's import file", () => {
    expect(() =>
      assertFileAccess(
        operator,
        { objectKey: "imports/job.xlsx", createdById: "other" },
        "read"
      )
    ).toThrow(ForbiddenException)
  })
})
