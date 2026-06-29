import { IsOptional, IsString } from 'class-validator';

export class CommunitySettingsQueryDto {
  @IsOptional()
  @IsString()
  communityId?: string;
}