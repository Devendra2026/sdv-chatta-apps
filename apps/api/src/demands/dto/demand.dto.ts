import { Type } from "class-transformer"
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator"

export class PublishDemandDto {
  @IsString()
  @MinLength(1)
  surveyId!: string

  @IsString()
  @MinLength(1)
  assessmentYearId!: string
}

export class PublishWardDemandsDto {
  @IsString()
  @MinLength(1)
  wardId!: string

  @IsString()
  @MinLength(1)
  assessmentYearId!: string
}

export class GetDemandQueryDto {
  @IsString()
  @MinLength(1)
  surveyId!: string

  @IsString()
  @MinLength(1)
  assessmentYearId!: string
}

export class GetPublishedDemandQueryDto {
  @IsString()
  @MinLength(1)
  surveyId!: string

  @IsOptional()
  @IsString()
  assessmentYearId?: string
}

export class YearEndDto {
  @IsString()
  @MinLength(1)
  fromYearId!: string

  @IsString()
  @MinLength(1)
  toYearId!: string
}

export class ListDemandsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @IsString()
  wardId?: string

  @IsOptional()
  @IsString()
  assessmentYearId?: string

  @IsOptional()
  @IsString()
  surveyId?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  status?: string

  /** When "true", only outstanding > 0 */
  @IsOptional()
  @IsString()
  outstandingOnly?: string
}
