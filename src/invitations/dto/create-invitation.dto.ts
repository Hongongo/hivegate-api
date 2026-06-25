import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
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

  /**
   * Invitación rápida.
   * Ejemplo: validForMinutes = 120
   * validFrom = ahora
   * validUntil = ahora + 120 minutos
   */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(10080)
  validForMinutes?: number;

  /**
   * Invitación programada.
   * Deben venir ambos: validFrom y validUntil.
   */
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}