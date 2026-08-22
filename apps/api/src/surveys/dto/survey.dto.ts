import { Type } from "class-transformer"
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"

export enum SurveyStatusDto {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export enum DataQualityStatusDto {
  COMPLETE = "COMPLETE",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  INVALID = "INVALID",
  DUPLICATE = "DUPLICATE",
  MISSING_CONTACT = "MISSING_CONTACT",
  MISSING_PROPERTY_NUMBER = "MISSING_PROPERTY_NUMBER",
  MISSING_MEASUREMENT = "MISSING_MEASUREMENT",
}

export class CreateSurveyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  surveyId!: string

  @IsOptional()
  @IsDateString()
  surveyedAt?: string

  @IsString()
  wardId!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ownerName?: string

  @IsOptional()
  @IsString()
  ownerFatherName?: string

  @IsOptional()
  @IsString()
  mobile?: string

  @IsOptional()
  @IsString()
  ownerAadhaar?: string

  @IsOptional()
  @IsBoolean()
  isSlum?: boolean

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsString()
  parcelNo?: string

  @IsOptional()
  @IsString()
  propertyNo?: string

  @IsOptional()
  @IsString()
  electricityId?: string

  @IsOptional()
  @IsString()
  khasraNo?: string

  @IsOptional()
  @IsString()
  registryNo?: string

  @IsOptional()
  @IsString()
  constructedDate?: string

  @IsOptional()
  @IsString()
  respondentName?: string

  @IsOptional()
  @IsString()
  respondentRelationship?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  pincode?: string

  @IsOptional()
  @IsString()
  houseNo?: string

  @IsOptional()
  @IsString()
  streetName?: string

  @IsOptional()
  @IsString()
  locality?: string

  @IsOptional()
  @IsString()
  colony?: string

  @IsOptional()
  @IsString()
  presentHouseNo?: string

  @IsOptional()
  @IsString()
  presentStreetName?: string

  @IsOptional()
  @IsString()
  presentLocality?: string

  @IsOptional()
  @IsString()
  presentColony?: string

  @IsOptional()
  @IsString()
  presentCity?: string

  @IsOptional()
  @IsString()
  presentPincode?: string

  @IsOptional()
  @IsBoolean()
  isSameAsProperty?: boolean

  @IsOptional()
  @IsString()
  taxRateZone?: string

  @IsOptional()
  @IsString()
  propertyOwnership?: string

  @IsOptional()
  @IsString()
  propertyUse?: string

  @IsOptional()
  @IsString()
  commercial?: string

  @IsOptional()
  @IsString()
  yearOfConstruction?: string

  @IsOptional()
  @IsString()
  exemptionType?: string

  @IsOptional()
  @IsBoolean()
  exemptionApplicable?: boolean

  @IsOptional()
  @IsString()
  situation?: string

  @IsOptional()
  @IsString()
  roadType?: string

  @IsOptional()
  @IsString()
  floorsRaw?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plotAreaSqFt?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plotAreaSqMeter?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plinthAreaSqFt?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plinthAreaSqMeter?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalBuiltUpAreaSqFt?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalBuiltUpAreaSqMeter?: number

  @IsOptional()
  @IsBoolean()
  hasMunicipalWaterSupply?: boolean

  @IsOptional()
  @IsBoolean()
  hasAlternateWater?: boolean

  @IsOptional()
  @IsString()
  waterSourceType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalWaterConnections?: number

  @IsOptional()
  @IsString()
  waterConnectionIdType?: string

  @IsOptional()
  @IsString()
  toiletType?: string

  @IsOptional()
  @IsBoolean()
  hasMunicipalWasteService?: boolean

  @IsOptional()
  @IsEnum(SurveyStatusDto)
  status?: SurveyStatusDto

  @IsOptional()
  @IsEnum(DataQualityStatusDto)
  dataQualityStatus?: DataQualityStatusDto
}

export class UpdateSurveyDto extends CreateSurveyDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  declare surveyId: string

  @IsOptional()
  @IsString()
  declare wardId: string
}

export class ListSurveysQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 50

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  wardId?: string

  @IsOptional()
  @IsEnum(SurveyStatusDto)
  status?: SurveyStatusDto

  @IsOptional()
  @IsString()
  propertyUse?: string

  @IsOptional()
  @IsString()
  propertyOwnership?: string

  @IsOptional()
  @IsString()
  taxRateZone?: string

  @IsOptional()
  @IsString()
  locality?: string

  @IsOptional()
  @IsString()
  colony?: string

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSlum?: boolean

  @IsOptional()
  @IsString()
  commercial?: string

  @IsOptional()
  @IsDateString()
  surveyedFrom?: string

  @IsOptional()
  @IsDateString()
  surveyedTo?: string

  @IsOptional()
  @IsEnum(DataQualityStatusDto)
  dataQualityStatus?: DataQualityStatusDto

  @IsOptional()
  @IsString()
  sortBy?: string = "parcelNo"

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "asc"
}
