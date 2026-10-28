import { Type } from "class-transformer"
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator"

export enum TaxAdjustmentKindDto {
  REBATE = "REBATE",
  PENALTY = "PENALTY",
}

export enum TaxAdjustmentHeadDto {
  PROPERTY = "PROPERTY",
  WATER = "WATER",
}

export enum TaxAdjustmentMethodDto {
  PERCENT_OF_HEAD = "PERCENT_OF_HEAD",
  FLAT_AMOUNT = "FLAT_AMOUNT",
}

export enum TaxAdjustmentStatusDto {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export class ListTaxAdjustmentsQueryDto {
  @IsOptional()
  @IsEnum(TaxAdjustmentKindDto)
  kind?: TaxAdjustmentKindDto

  @IsOptional()
  @IsEnum(TaxAdjustmentHeadDto)
  head?: TaxAdjustmentHeadDto

  @IsOptional()
  @IsEnum(TaxAdjustmentStatusDto)
  status?: TaxAdjustmentStatusDto

  @IsOptional()
  @IsString()
  search?: string
}

export class CreateTaxAdjustmentDto {
  @IsEnum(TaxAdjustmentKindDto)
  kind!: TaxAdjustmentKindDto

  @IsEnum(TaxAdjustmentHeadDto)
  head!: TaxAdjustmentHeadDto

  @IsString()
  @MinLength(2)
  name!: string

  @IsEnum(TaxAdjustmentMethodDto)
  method!: TaxAdjustmentMethodDto

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cap?: number | null

  @IsOptional()
  @IsString()
  assessmentYearId?: string | null

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null
}

export class UpdateTaxAdjustmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsEnum(TaxAdjustmentMethodDto)
  method?: TaxAdjustmentMethodDto

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cap?: number | null

  @IsOptional()
  @IsString()
  assessmentYearId?: string | null

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null
}
