import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '../generated/prisma/client';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.user.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          communityId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    }

    if (currentUser.role === UserRole.COMMUNITY_ADMIN) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return this.prisma.user.findMany({
        where: {
          communityId: currentUser.communityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          communityId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    }

    throw new ForbiddenException('Insufficient role');
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        communityId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        homesOwnedOrLinked: {
          select: {
            id: true,
            status: true,
            isPrimary: true,
            home: {
              select: {
                id: true,
                code: true,
                street: true,
                number: true,
                block: true,
                lot: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return user;
    }

    if (currentUser.role === UserRole.COMMUNITY_ADMIN) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      if (user.communityId !== currentUser.communityId) {
        throw new ForbiddenException('User belongs to another community');
      }

      return user;
    }

    throw new ForbiddenException('Insufficient role');
  }
}