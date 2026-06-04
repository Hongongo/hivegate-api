import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import { AccessLogsService } from './access-logs.service';
import { ValidateQrDto } from './dto/validate-qr.dto';

@Controller('access-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessLogsController {
  constructor(private readonly accessLogsService: AccessLogsService) {}

  @Post('validate-qr')
  @Roles(UserRole.GUARD, UserRole.COMMUNITY_ADMIN)
  validateQr(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: ValidateQrDto,
  ) {
    return this.accessLogsService.validateQr(currentUser, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.accessLogsService.findAll(currentUser);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.GUARD)
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.accessLogsService.findOne(id, currentUser);
  }
}