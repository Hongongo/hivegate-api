import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { InvitationType } from '../../generated/prisma/client';

export class CreateInvitationDto {
  @IsString()
  homeId!: string;

  @IsEnum(InvitationType)
  type!: InvitationType;

  @IsString()
  @MinLength(2)
  visitorName!: string;

  @IsOptional()
  @IsString()
  visitorPhone?: string;

  @IsOptional()
  @IsString()
  visitorCompany?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validUntil!: string;
}