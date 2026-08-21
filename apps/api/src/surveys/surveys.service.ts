import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { Prisma, type Survey } from "@prisma/client"

import { AuditService } from "../audit/audit.service"
import type { AuthUser } from "../auth/auth.decorators"
import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"
import {
  CreateSurveyDto,
  ListSurveysQueryDto,
  UpdateSurveyDto,
} from "./dto/survey.dto"
import { computeDataQuality, parseFloorsRaw } from "./floors.util"

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService
  ) {}

  async create(dto: CreateSurveyDto, user: AuthUser) {
    const existing = await this.prisma.survey.findUnique({
      where: { surveyId: dto.surveyId },
    })
    if (existing && !existing.deletedAt) {
      throw new ConflictException({
        code: "SURVEY_EXISTS",
        message: `Survey ${dto.surveyId} already exists`,
      })
    }

    const ward = await this.prisma.ward.findUnique({ where: { id: dto.wardId } })
    if (!ward) {
      throw new NotFoundException({
        code: "WARD_NOT_FOUND",
        message: "Ward not found",
      })
    }

    const floors = parseFloorsRaw(dto.floorsRaw)
    const dataQualityStatus =
      dto.dataQualityStatus ??
      computeDataQuality({
        mobile: dto.mobile,
        propertyNo: dto.propertyNo,
        parcelNo: dto.parcelNo,
        plotAreaSqFt: dto.plotAreaSqFt,
        totalBuiltUpAreaSqFt: dto.totalBuiltUpAreaSqFt,
      })

    const survey = await this.prisma.survey.create({
      data: {
        ...this.toPrismaData(dto),
        dataQualityStatus,
        createdById: user.id,
        updatedById: user.id,
        floors: {
          create: floors.map((f) => ({
            floorLabel: f.floorLabel,
            areaSqFt: f.areaSqFt,
            areaSqMeter: f.areaSqMeter,
            usageType: f.usageType,
            usageFactor: f.usageFactor,
            buildingType: f.buildingType,
            sortOrder: f.sortOrder,
            rawSegment: f.rawSegment,
          })),
        },
      },
      include: this.defaultInclude(),
    })

    await this.audit.log({
      action: "SURVEY_CREATED",
      entity: "Survey",
      entityId: survey.id,
      actorId: user.id,
      newValue: { surveyId: survey.surveyId },
    })

    return survey
  }

  async findAll(query: ListSurveysQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const where = this.buildWhere(query)

    const sortable = new Set([
      "createdAt",
      "surveyedAt",
      "surveyId",
      "ownerName",
      "mobile",
      "status",
      "parcelNo",
      "propertyNo",
    ])
    const sortBy = sortable.has(query.sortBy ?? "")
      ? (query.sortBy as string)
      : "parcelNo"
    const sortOrder: Prisma.SortOrder = query.sortOrder === "desc" ? "desc" : "asc"

    const orderBy: Prisma.SurveyOrderByWithRelationInput[] =
      sortBy === "parcelNo"
        ? [
            { ward: { number: "asc" } },
            { surveyId: sortOrder },
            { parcelNo: sortOrder },
          ]
        : [{ [sortBy]: sortOrder }]

    const [total, items] = await this.prisma.$transaction([
      this.prisma.survey.count({ where }),
      this.prisma.survey.findMany({
        where,
        include: {
          ward: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    }
  }

  async findOne(id: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { OR: [{ id }, { surveyId: id }], deletedAt: null },
      include: this.defaultInclude(),
    })
    if (!survey) {
      throw new NotFoundException({
        code: "SURVEY_NOT_FOUND",
        message: "Survey not found",
      })
    }
    return survey
  }

  async findNeighbors(survey: { id: string; wardId: string; surveyId: string }) {
    const whereBase = {
      wardId: survey.wardId,
      deletedAt: null,
      status: { not: "DELETED" as const },
      id: { not: survey.id },
    }

    const [previous, next] = await Promise.all([
      this.prisma.survey.findFirst({
        where: { ...whereBase, surveyId: { lt: survey.surveyId } },
        orderBy: { surveyId: "desc" },
        select: { id: true, surveyId: true },
      }),
      this.prisma.survey.findFirst({
        where: { ...whereBase, surveyId: { gt: survey.surveyId } },
        orderBy: { surveyId: "asc" },
        select: { id: true, surveyId: true },
      }),
    ])

    return { previous, next }
  }

  async update(id: string, dto: UpdateSurveyDto, user: AuthUser) {
    const current = await this.findOne(id)

    if (dto.surveyId && dto.surveyId !== current.surveyId) {
      const clash = await this.prisma.survey.findUnique({
        where: { surveyId: dto.surveyId },
      })
      if (clash && clash.id !== current.id) {
        throw new ConflictException({
          code: "SURVEY_EXISTS",
          message: `Survey ${dto.surveyId} already exists`,
        })
      }
    }

    if (dto.wardId) {
      const ward = await this.prisma.ward.findUnique({
        where: { id: dto.wardId },
      })
      if (!ward) {
        throw new NotFoundException({
          code: "WARD_NOT_FOUND",
          message: "Ward not found",
        })
      }
    }

    const floorsRaw = dto.floorsRaw ?? current.floorsRaw
    const floors = parseFloorsRaw(floorsRaw)

    const survey = await this.prisma.$transaction(async (tx) => {
      await tx.surveyFloor.deleteMany({ where: { surveyId: current.id } })
      return tx.survey.update({
        where: { id: current.id },
        data: {
          ...this.toPrismaData({ ...dto, floorsRaw: floorsRaw ?? undefined }),
          dataQualityStatus:
            dto.dataQualityStatus ??
            computeDataQuality({
              mobile: dto.mobile ?? current.mobile,
              propertyNo: dto.propertyNo ?? current.propertyNo,
              parcelNo: dto.parcelNo ?? current.parcelNo,
              plotAreaSqFt:
                dto.plotAreaSqFt ??
                (current.plotAreaSqFt ? Number(current.plotAreaSqFt) : null),
              totalBuiltUpAreaSqFt:
                dto.totalBuiltUpAreaSqFt ??
                (current.totalBuiltUpAreaSqFt
                  ? Number(current.totalBuiltUpAreaSqFt)
                  : null),
            }),
          updatedById: user.id,
          floors: {
            create: floors.map((f) => ({
              floorLabel: f.floorLabel,
              areaSqFt: f.areaSqFt,
              areaSqMeter: f.areaSqMeter,
              usageType: f.usageType,
              usageFactor: f.usageFactor,
              buildingType: f.buildingType,
              sortOrder: f.sortOrder,
              rawSegment: f.rawSegment,
            })),
          },
        },
        include: this.defaultInclude(),
      })
    })

    await this.audit.log({
      action: "SURVEY_UPDATED",
      entity: "Survey",
      entityId: survey.id,
      actorId: user.id,
      oldValue: { surveyId: current.surveyId },
      newValue: { surveyId: survey.surveyId },
    })

    return survey
  }

  async remove(id: string, user: AuthUser) {
    const current = await this.findOne(id)
    const survey = await this.prisma.survey.update({
      where: { id: current.id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        updatedById: user.id,
      },
    })

    await this.audit.log({
      action: "SURVEY_DELETED",
      entity: "Survey",
      entityId: survey.id,
      actorId: user.id,
      oldValue: { surveyId: current.surveyId },
    })

    return survey
  }

  private buildWhere(query: ListSurveysQueryDto): Prisma.SurveyWhereInput {
    const where: Prisma.SurveyWhereInput = {
      deletedAt: null,
      status: query.status ?? { not: "DELETED" },
    }

    if (query.wardId) where.wardId = query.wardId
    if (query.propertyUse) where.propertyUse = query.propertyUse
    if (query.propertyOwnership) where.propertyOwnership = query.propertyOwnership
    if (query.taxRateZone) where.taxRateZone = query.taxRateZone
    if (query.locality) where.locality = { contains: query.locality, mode: "insensitive" }
    if (query.colony) where.colony = { contains: query.colony, mode: "insensitive" }
    if (typeof query.isSlum === "boolean") where.isSlum = query.isSlum
    if (query.commercial) where.commercial = query.commercial
    if (query.dataQualityStatus) where.dataQualityStatus = query.dataQualityStatus

    if (query.surveyedFrom || query.surveyedTo) {
      where.surveyedAt = {}
      if (query.surveyedFrom) where.surveyedAt.gte = new Date(query.surveyedFrom)
      if (query.surveyedTo) where.surveyedAt.lte = new Date(query.surveyedTo)
    }

    if (query.search?.trim()) {
      const q = query.search.trim()
      where.OR = [
        { surveyId: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q } },
        { parcelNo: { contains: q, mode: "insensitive" } },
        { propertyNo: { contains: q, mode: "insensitive" } },
        { locality: { contains: q, mode: "insensitive" } },
      ]
    }

    return where
  }

  private toPrismaData(dto: Partial<CreateSurveyDto>): Prisma.SurveyUncheckedCreateInput {
    return {
      surveyId: dto.surveyId!,
      wardId: dto.wardId!,
      surveyedAt: dto.surveyedAt ? new Date(dto.surveyedAt) : undefined,
      ownerName: dto.ownerName,
      ownerFatherName: dto.ownerFatherName,
      mobile: dto.mobile,
      ownerAadhaar: dto.ownerAadhaar,
      isSlum: dto.isSlum ?? false,
      remark: dto.remark,
      parcelNo: dto.parcelNo,
      propertyNo: dto.propertyNo,
      electricityId: dto.electricityId,
      khasraNo: dto.khasraNo,
      registryNo: dto.registryNo,
      constructedDate: dto.constructedDate,
      respondentName: dto.respondentName,
      respondentRelationship: dto.respondentRelationship,
      city: dto.city,
      pincode: dto.pincode,
      houseNo: dto.houseNo,
      streetName: dto.streetName,
      locality: dto.locality,
      colony: dto.colony,
      presentHouseNo: dto.presentHouseNo,
      presentStreetName: dto.presentStreetName,
      presentLocality: dto.presentLocality,
      presentColony: dto.presentColony,
      presentCity: dto.presentCity,
      presentPincode: dto.presentPincode,
      isSameAsProperty: dto.isSameAsProperty,
      taxRateZone: dto.taxRateZone,
      propertyOwnership: dto.propertyOwnership,
      propertyUse: dto.propertyUse,
      commercial: dto.commercial,
      yearOfConstruction: dto.yearOfConstruction,
      exemptionType: dto.exemptionType,
      exemptionApplicable: dto.exemptionApplicable,
      situation: dto.situation,
      roadType: dto.roadType,
      floorsRaw: dto.floorsRaw,
      plotAreaSqFt: dto.plotAreaSqFt,
      plotAreaSqMeter: dto.plotAreaSqMeter,
      plinthAreaSqFt: dto.plinthAreaSqFt,
      plinthAreaSqMeter: dto.plinthAreaSqMeter,
      totalBuiltUpAreaSqFt: dto.totalBuiltUpAreaSqFt,
      totalBuiltUpAreaSqMeter: dto.totalBuiltUpAreaSqMeter,
      hasMunicipalWaterSupply: dto.hasMunicipalWaterSupply,
      hasAlternateWater: dto.hasAlternateWater,
      waterSourceType: dto.waterSourceType,
      totalWaterConnections: dto.totalWaterConnections,
      waterConnectionIdType: dto.waterConnectionIdType,
      toiletType: dto.toiletType,
      hasMunicipalWasteService: dto.hasMunicipalWasteService,
      status: dto.status,
    }
  }

  private defaultInclude() {
    return {
      ward: true,
      floors: { orderBy: { sortOrder: "asc" as const } },
      attachments: {
        orderBy: { createdAt: "asc" as const },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
    }
  }

  maskPii<T extends Survey>(survey: T, canReadPii: boolean): T {
    if (canReadPii) return survey
    return {
      ...survey,
      ownerAadhaar: survey.ownerAadhaar
        ? `XXXX-XXXX-${survey.ownerAadhaar.slice(-4)}`
        : survey.ownerAadhaar,
    }
  }

  async withAttachmentUrls<T extends { attachments?: Array<{ objectKey: string; mimeType: string }> }>(
    survey: T
  ) {
    if (!survey.attachments?.length) return survey
    const attachments = await Promise.all(
      survey.attachments.map(async (a) => {
        let url: string | null = null
        try {
          url = await this.storage.getSignedUrl(a.objectKey, 600)
        } catch {
          url = null
        }
        return { ...a, url }
      })
    )
    return { ...survey, attachments }
  }

  async addAttachment(
    surveyId: string,
    file: Express.Multer.File,
    user: AuthUser
  ) {
    const current = await this.findOne(surveyId)
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_").slice(0, 180)
    const objectKey = `surveys/${current.id}/${Date.now()}-${safeName}`
    await this.storage.putObject(objectKey, file.buffer, file.mimetype)
    const attachment = await this.prisma.surveyAttachment.create({
      data: {
        surveyId: current.id,
        objectKey,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        bucket: process.env.MINIO_BUCKET ?? "chhata-surveys",
        uploadedById: user.id,
      },
    })
    await this.audit.log({
      action: "SURVEY_ATTACHMENT_ADDED",
      entity: "Survey",
      entityId: current.id,
      actorId: user.id,
      newValue: { fileName: file.originalname, mimeType: file.mimetype },
    })
    const url = await this.storage.getSignedUrl(objectKey, 600).catch(() => null)
    return { ...attachment, url }
  }

  async removeAttachment(
    surveyId: string,
    attachmentId: string,
    user: AuthUser
  ) {
    const current = await this.findOne(surveyId)
    const attachment = await this.prisma.surveyAttachment.findFirst({
      where: { id: attachmentId, surveyId: current.id },
    })
    if (!attachment) {
      throw new NotFoundException({
        code: "ATTACHMENT_NOT_FOUND",
        message: "Attachment not found",
      })
    }
    await this.prisma.surveyAttachment.delete({ where: { id: attachmentId } })
    await this.audit.log({
      action: "SURVEY_ATTACHMENT_REMOVED",
      entity: "Survey",
      entityId: current.id,
      actorId: user.id,
      oldValue: { fileName: attachment.originalFileName },
    })
    return { id: attachmentId }
  }
}
