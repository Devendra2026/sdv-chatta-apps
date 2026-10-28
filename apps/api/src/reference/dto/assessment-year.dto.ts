import { Type } from "class-transformer"
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateAssessmentYearDto {
  @IsString()
  @MinLength(2)
  code!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, { message: "startDate must be YYYY-MM-DD" })
  startDate?: string

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, { message: "endDate must be YYYY-MM-DD" })
  endDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateAssessmentYearDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsString()
  @Matches(ISO_DATE, { message: "startDate must be YYYY-MM-DD" })
  startDate?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsString()
  @Matches(ISO_DATE, { message: "endDate must be YYYY-MM-DD" })
  endDate?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}
