import { Controller, Get } from "@nestjs/common"

import { RequirePermission } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"

@Controller("api/v1/wards")
export class WardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("survey:read")
  async list() {
    const wards = await this.prisma.ward.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
      include: {
        _count: {
          select: {
            surveys: {
              where: { deletedAt: null, status: { not: "DELETED" } },
            },
          },
        },
      },
    })
    return {
      success: true,
      data: wards.map((ward) => ({
        id: ward.id,
        code: ward.code,
        name: ward.name,
        number: ward.number,
        isActive: ward.isActive,
        surveyCount: ward._count.surveys,
      })),
    }
  }
}
