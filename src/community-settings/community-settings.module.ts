import { Module } from '@nestjs/common';
import { CommunitySettingsController } from './community-settings.controller';
import { CommunitySettingsService } from './community-settings.service';

@Module({
  controllers: [CommunitySettingsController],
  providers: [CommunitySettingsService],
})
export class CommunitySettingsModule { }