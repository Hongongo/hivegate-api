import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { JwtPayload } from '../common/types/jwt-payload.type';
import { HomeResidentStatus, UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.home.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: this.getHomeSelect(),
      });
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return this.prisma.home.findMany({
        where: {
          communityId: currentUser.communityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: this.getHomeSelect(),
      });
    }

    throw new ForbiddenException('Insufficient role');
  }

  async findMine(currentUser: JwtPayload) {
    return this.prisma.home.findMany({
      where: {
        residents: {
          some: {
            userId: currentUser.sub,
            status: HomeResidentStatus.ACTIVE,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.getHomeSelect(),
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const home = await this.prisma.home.findUnique({
      where: {
        id,
      },
      select: this.getHomeSelect(),
    });

    if (!home) {
      throw new NotFoundException('Home not found');
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return home;
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      if (home.communityId !== currentUser.communityId) {
        throw new ForbiddenException('Home belongs to another community');
      }

      return home;
    }

    if (this.isResidentRole(currentUser.role)) {
      const linkedHome = await this.prisma.homeResident.findFirst({
        where: {
          homeId: id,
          userId: currentUser.sub,
          status: HomeResidentStatus.ACTIVE,
        },
      });

      if (!linkedHome) {
        throw new ForbiddenException('You are not linked to this home');
      }

      return home;
    }

    throw new ForbiddenException('Insufficient role');
  }

    private isResidentRole(role: UserRole): boolean {
    return (
        role === UserRole.RESIDENT_OWNER ||
        role === UserRole.RESIDENT_TENANT ||
        role === UserRole.RESIDENT_MEMBER
    );
    }

  private getHomeSelect() {
    return {
      id: true,
      communityId: true,
      code: true,
      street: true,
      number: true,
      block: true,
      lot: true,
      notes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      residents: {
        select: {
          id: true,
          status: true,
          isPrimary: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      },
    };
  }
}