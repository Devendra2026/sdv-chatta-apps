import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator"

export class CreatePublicPropertyTaxPaymentDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  surveyId!: string

  @IsString()
  @Matches(/^\d{10}$/, { message: "payerMobile must be exactly 10 digits" })
  payerMobile!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  payerEmail?: string
}
