import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import { HomesService } from './homes.service';

@Controller('homes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomesController {
  constructor(private readonly homesService: HomesService) {}

  @Get('my')
  @Roles(
    UserRole.RESIDENT_OWNER,
    UserRole.RESIDENT_TENANT,
    UserRole.RESIDENT_MEMBER,
    UserRole.COMMUNITY_ADMIN,
  )
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.homesService.findMine(currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.homesService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMMUNITY_ADMIN,
    UserRole.GUARD,
    UserRole.RESIDENT_OWNER,
    UserRole.RESIDENT_TENANT,
    UserRole.RESIDENT_MEMBER,
  )
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.homesService.findOne(id, currentUser);
  }
}