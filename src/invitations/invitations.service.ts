import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

import type { JwtPayload } from '../common/types/jwt-payload.type';
import {
  HomeResidentStatus,
  InvitationStatus,
  QrTokenStatus,
  UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUser: JwtPayload, dto: CreateInvitationDto) {
    if (!this.isResidentRole(currentUser.role)) {
      throw new ForbiddenException('Only residents can create invitations');
    }

    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);

    if (Number.isNaN(validFrom.getTime())) {
      throw new BadRequestException('Invalid validFrom date');
    }

    if (Number.isNaN(validUntil.getTime())) {
      throw new BadRequestException('Invalid validUntil date');
    }

    if (validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    const homeResident = await this.prisma.homeResident.findFirst({
      where: {
        homeId: dto.homeId,
        userId: currentUser.sub,
        status: HomeResidentStatus.ACTIVE,
      },
      include: {
        home: true,
      },
    });

    if (!homeResident) {
      throw new ForbiddenException('You are not linked to this home');
    }

    if (!homeResident.home.isActive) {
      throw new BadRequestException('Home is inactive');
    }

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);

    const result = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.create({
        data: {
          communityId: homeResident.home.communityId,
          homeId: homeResident.homeId,
          createdById: currentUser.sub,
          type: dto.type,
          status: InvitationStatus.ACTIVE,
          visitorName: dto.visitorName,
          visitorPhone: dto.visitorPhone,
          visitorCompany: dto.visitorCompany,
          notes: dto.notes,
          validFrom,
          validUntil,
          maxUses: 1,
          usedCount: 0,
        },
        select: this.getInvitationSelect(),
      });

      const qrToken = await tx.qrToken.create({
        data: {
          invitationId: invitation.id,
          tokenHash,
          status: QrTokenStatus.ACTIVE,
          expiresAt: validUntil,
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          communityId: homeResident.home.communityId,
          actorId: currentUser.sub,
          action: 'INVITATION_CREATED',
          entityType: 'Invitation',
          entityId: invitation.id,
          metadata: {
            homeId: homeResident.homeId,
            visitorName: dto.visitorName,
            type: dto.type,
          },
        },
      });

      return {
        invitation,
        qrToken,
      };
    });

    return {
      ...result,
      qr: {
        token: rawToken,
        payload: rawToken,
        note: 'Use this token as QR payload. Store/display it only once.',
      },
    };
  }

  async findMine(currentUser: JwtPayload) {
    return this.prisma.invitation.findMany({
      where: {
        createdById: currentUser.sub,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.getInvitationSelect(),
    });
  }

  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.invitation.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: this.getInvitationSelect(),
      });
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return this.prisma.invitation.findMany({
        where: {
          communityId: currentUser.communityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: this.getInvitationSelect(),
      });
    }

    throw new ForbiddenException('Insufficient role');
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        id,
      },
      select: this.getInvitationSelect(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return invitation;
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      if (invitation.communityId !== currentUser.communityId) {
        throw new ForbiddenException(
          'Invitation belongs to another community',
        );
      }

      return invitation;
    }

    if (this.isResidentRole(currentUser.role)) {
      if (invitation.createdById !== currentUser.sub) {
        throw new ForbiddenException('You cannot access this invitation');
      }

      return invitation;
    }

    throw new ForbiddenException('Insufficient role');
  }

  private generateRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private isResidentRole(role: UserRole): boolean {
    return (
      role === UserRole.RESIDENT_OWNER ||
      role === UserRole.RESIDENT_TENANT ||
      role === UserRole.RESIDENT_MEMBER
    );
  }

  private getInvitationSelect() {
    return {
      id: true,
      communityId: true,
      homeId: true,
      createdById: true,
      type: true,
      status: true,
      visitorName: true,
      visitorPhone: true,
      visitorCompany: true,
      notes: true,
      validFrom: true,
      validUntil: true,
      maxUses: true,
      usedCount: true,
      createdAt: true,
      updatedAt: true,
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
      createdBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      qrTokens: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
        },
      },
    };
  }
}