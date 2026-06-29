import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  AccessDirection,
  AccessMethod,
  AccessResult,
} from '../../generated/prisma/client';

export class AccessLogQueryDto {
  @IsOptional()
  @IsEnum(AccessDirection)
  direction?: AccessDirection;

  @IsOptional()
  @IsEnum(AccessMethod)
  method?: AccessMethod;

  @IsOptional()
  @IsEnum(AccessResult)
  result?: AccessResult;

  @IsOptional()
  @IsString()
  homeId?: string;

  @IsOptional()
  @IsString()
  guardId?: string;

  @IsOptional()
  @IsString()
  visitorName?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}