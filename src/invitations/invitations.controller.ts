import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';
import { CancelInvitationDto } from './dto/cancel-invitation.dto';

@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles(
    UserRole.RESIDENT_OWNER,
    UserRole.RESIDENT_TENANT,
    UserRole.RESIDENT_MEMBER,
  )
  create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(currentUser, dto);
  }

  @Get('my')
  @Roles(
    UserRole.RESIDENT_OWNER,
    UserRole.RESIDENT_TENANT,
    UserRole.RESIDENT_MEMBER,
  )
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.invitationsService.findMine(currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.invitationsService.findAll(currentUser);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMMUNITY_ADMIN,
    UserRole.RESIDENT_OWNER,
    UserRole.RESIDENT_TENANT,
    UserRole.RESIDENT_MEMBER,
  )
  cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CancelInvitationDto,
  ) {
    return this.invitationsService.cancel(id, currentUser, dto);
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
    return this.invitationsService.findOne(id, currentUser);
  }
}