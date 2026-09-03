import { Type } from "class-transformer"
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from "class-validator"

export class UpdateTaxConfigParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  propertyTaxPct?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waterTaxPct?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  drainageTaxPct?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  penaltyPct?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  assessablePct?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commercialAssessablePct?: number

  @IsOptional()
  @IsString()
  reason?: string
}

export class UpsertTaxCellDto {
  @IsString()
  roadWidthEntryId!: string

  @IsString()
  constructionEntryId!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualRatePerSqFt!: number
}

export class UpsertTaxCellsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertTaxCellDto)
  cells!: UpsertTaxCellDto[]
}

export class TaxPreviewDto {
  @IsString()
  wardId!: string

  @IsString()
  assessmentYearId!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaSqFt!: number

  @IsString()
  roadWidthEntryId!: string

  @IsString()
  constructionEntryId!: string

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]$/, {
    message: "GIS use code must be a single letter (A–Z)",
  })
  gisUseCode?: string
}

export class PublishTaxConfigDto {
  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsString()
  effectiveFrom?: string
}

export class CopyTaxToWardsDto {
  @IsString()
  sourceWardId!: string

  @IsString()
  assessmentYearId!: string
}
