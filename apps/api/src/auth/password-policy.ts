import { BadRequestException } from "@nestjs/common"

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export function assertPasswordPolicy(password: string): void {
  const len = password.length
  if (len < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException({
      code: "PASSWORD_TOO_SHORT",
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    })
  }
  if (len > PASSWORD_MAX_LENGTH) {
    throw new BadRequestException({
      code: "PASSWORD_TOO_LONG",
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    })
  }
}
