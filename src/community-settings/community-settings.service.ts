import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { JwtPayload } from '../common/types/jwt-payload.type';
import { UserRole } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunitySettingsQueryDto } from './dto/community-settings-query.dto';
import { UpdateCommunitySettingDto } from './dto/update-community-setting.dto';

@Injectable()
export class CommunitySettingsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(currentUser: JwtPayload, query: CommunitySettingsQueryDto) {
    const where = this.buildCommunityWhere(currentUser, query);

    return this.prisma.communitySetting.findMany({
      where,
      orderBy: {
        key: 'asc',
      },
      select: this.getSettingSelect(),
    });
  }

  async findOne(
    key: string,
    currentUser: JwtPayload,
    query: CommunitySettingsQueryDto,
  ) {
    const communityId = this.getTargetCommunityId(currentUser, query, {
      requireForSuperAdmin: true,
    });

    const setting = await this.prisma.communitySetting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key,
        },
      },
      select: this.getSettingSelect(),
    });

    if (!setting) {
      throw new NotFoundException('Community setting not found');
    }

    return setting;
  }

  async update(
    key: string,
    currentUser: JwtPayload,
    query: CommunitySettingsQueryDto,
    dto: UpdateCommunitySettingDto,
  ) {
    const communityId = this.getTargetCommunityId(currentUser, query, {
      requireForSuperAdmin: true,
    });

    const value = this.validateSettingValue(key, dto.value);

    const community = await this.prisma.community.findUnique({
      where: {
        id: communityId,
      },
      select: {
        id: true,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const setting = await tx.communitySetting.upsert({
        where: {
          communityId_key: {
            communityId,
            key,
          },
        },
        update: {
          value,
        },
        create: {
          communityId,
          key,
          value,
        },
        select: this.getSettingSelect(),
      });

      await tx.auditLog.create({
        data: {
          communityId,
          actorId: currentUser.sub,
          action: 'COMMUNITY_SETTING_UPDATED',
          entityType: 'CommunitySetting',
          entityId: setting.id,
          metadata: {
            key,
            value,
          },
        },
      });

      return setting;
    });

    return {
      message: 'Community setting updated successfully',
      setting: result,
    };
  }

  private buildCommunityWhere(
    currentUser: JwtPayload,
    query: CommunitySettingsQueryDto,
  ): Prisma.CommunitySettingWhereInput {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (query.communityId) {
        return {
          communityId: query.communityId,
        };
      }

      return {};
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return {
        communityId: currentUser.communityId,
      };
    }

    throw new ForbiddenException('Insufficient role');
  }

  private getTargetCommunityId(
    currentUser: JwtPayload,
    query: CommunitySettingsQueryDto,
    options?: {
      requireForSuperAdmin?: boolean;
    },
  ): string {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (!query.communityId && options?.requireForSuperAdmin) {
        throw new BadRequestException(
          'communityId query parameter is required for SUPER_ADMIN',
        );
      }

      if (!query.communityId) {
        throw new BadRequestException('communityId is required');
      }

      return query.communityId;
    }

    if (currentUser.role === UserRole.COMMUNITY_ADMIN) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return currentUser.communityId;
    }

    throw new ForbiddenException('Insufficient role');
  }

  private validateSettingValue(
    key: string,
    value: unknown,
  ): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      throw new BadRequestException('Setting value is required');
    }

    switch (key) {
      case 'defaultInvitationValidityMinutes':
      case 'qrExpirationMinutes':
      case 'maxInvitationValidityMinutes': {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          throw new BadRequestException(`${key} must be an integer`);
        }

        if (value < 5 || value > 10080) {
          throw new BadRequestException(
            `${key} must be between 5 and 10080 minutes`,
          );
        }

        return value;
      }

      case 'allowManualAccess':
      case 'requireExitLog': {
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`${key} must be a boolean`);
        }

        return value;
      }

      case 'gateMode': {
        if (typeof value !== 'string') {
          throw new BadRequestException('gateMode must be a string');
        }

        if (!['simulated', 'disabled', 'physical'].includes(value)) {
          throw new BadRequestException(
            'gateMode must be simulated, disabled or physical',
          );
        }

        return value;
      }

      default:
        throw new BadRequestException(`Unsupported setting key: ${key}`);
    }
  }

  private getSettingSelect() {
    return {
      id: true,
      communityId: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    };
  }
}