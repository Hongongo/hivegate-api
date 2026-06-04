import { IsOptional, IsString, MinLength } from 'class-validator';

export class ManualEntryDto {
  @IsString()
  homeId!: string;

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
}