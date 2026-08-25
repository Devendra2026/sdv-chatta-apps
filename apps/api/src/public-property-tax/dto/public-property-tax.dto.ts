import { Type } from "class-transformer"
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"

export const PUBLIC_PROPERTY_TAX_SEARCH_MODES = [
  "ward",
  "propertyId",
  "owner",
] as const

export type PublicPropertyTaxSearchMode =
  (typeof PUBLIC_PROPERTY_TAX_SEARCH_MODES)[number]

export class PublicPropertyTaxSearchQueryDto {
  @IsIn(PUBLIC_PROPERTY_TAX_SEARCH_MODES)
  mode!: PublicPropertyTaxSearchMode

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  wardNumber?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  propertyNo?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  propertyId?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ownerName?: string

  @IsOptional()
  @IsString()
  @MaxLength(15)
  mobile?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number = 10
}
