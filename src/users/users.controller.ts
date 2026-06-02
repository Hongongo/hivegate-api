import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN)
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.findOne(id, currentUser);
  }
}