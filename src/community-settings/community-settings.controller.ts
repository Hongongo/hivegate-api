import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import { CommunitySettingsService } from './community-settings.service';
import { CommunitySettingsQueryDto } from './dto/community-settings-query.dto';
import { UpdateCommunitySettingDto } from './dto/update-community-setting.dto';

@Controller('community-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunitySettingsController {
  constructor(
    private readonly communitySettingsService: CommunitySettingsService,
  ) { }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: CommunitySettingsQueryDto,
  ) {
    return this.communitySettingsService.findAll(currentUser, query);
  }

  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findOne(
    @Param('key') key: string,
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: CommunitySettingsQueryDto,
  ) {
    return this.communitySettingsService.findOne(key, currentUser, query);
  }

  @Patch(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN)
  update(
    @Param('key') key: string,
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: CommunitySettingsQueryDto,
    @Body() dto: UpdateCommunitySettingDto,
  ) {
    return this.communitySettingsService.update(
      key,
      currentUser,
      query,
      dto,
    );
  }
}