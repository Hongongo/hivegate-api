import { IsOptional, IsString } from 'class-validator';

export class CancelInvitationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}