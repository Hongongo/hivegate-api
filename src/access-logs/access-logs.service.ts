import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';

import type { JwtPayload } from '../common/types/jwt-payload.type';
import {
  AccessDirection,
  AccessMethod,
  AccessResult,
  DeviceStatus,
  DeviceType,
  GateCommandStatus,
  GateCommandType,
  InvitationStatus,
  QrTokenStatus,
  UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { RegisterExitDto } from './dto/register-exit.dto';
import { ManualEntryDto } from './dto/manual-entry.dto';

@Injectable()
export class AccessLogsService {
  constructor(private readonly prisma: PrismaService) { }

  async validateQr(currentUser: JwtPayload, dto: ValidateQrDto) {
    if (
      currentUser.role !== UserRole.GUARD &&
      currentUser.role !== UserRole.COMMUNITY_ADMIN
    ) {
      throw new ForbiddenException('Only guards can validate QR tokens');
    }

    if (!currentUser.communityId) {
      throw new ForbiddenException('User has no community assigned');
    }

    const tokenHash = this.hashToken(dto.token);

    const qrToken = await this.prisma.qrToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        invitation: {
          include: {
            home: true,
          },
        },
      },
    });

    if (!qrToken) {
      throw new NotFoundException('Invalid QR token');
    }

    const invitation = qrToken.invitation;

    if (invitation.communityId !== currentUser.communityId) {
      throw new ForbiddenException('QR token belongs to another community');
    }

    const now = new Date();

    if (qrToken.status !== QrTokenStatus.ACTIVE) {
      await this.createDeniedAccessLog({
        communityId: invitation.communityId,
        homeId: invitation.homeId,
        invitationId: invitation.id,
        qrTokenId: qrToken.id,
        guardId: currentUser.sub,
        visitorName: invitation.visitorName,
        deniedReason: `QR token is ${qrToken.status}`,
      });

      throw new BadRequestException(`QR token is ${qrToken.status}`);
    }

    if (qrToken.expiresAt <= now) {
      await this.prisma.qrToken.update({
        where: {
          id: qrToken.id,
        },
        data: {
          status: QrTokenStatus.EXPIRED,
        },
      });

      await this.prisma.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: InvitationStatus.EXPIRED,
        },
      });

      await this.createDeniedAccessLog({
        communityId: invitation.communityId,
        homeId: invitation.homeId,
        invitationId: invitation.id,
        qrTokenId: qrToken.id,
        guardId: currentUser.sub,
        visitorName: invitation.visitorName,
        deniedReason: 'QR token expired',
      });

      throw new BadRequestException('QR token expired');
    }

    if (invitation.status !== InvitationStatus.ACTIVE) {
      await this.createDeniedAccessLog({
        communityId: invitation.communityId,
        homeId: invitation.homeId,
        invitationId: invitation.id,
        qrTokenId: qrToken.id,
        guardId: currentUser.sub,
        visitorName: invitation.visitorName,
        deniedReason: `Invitation is ${invitation.status}`,
      });

      throw new BadRequestException(`Invitation is ${invitation.status}`);
    }

    if (invitation.validFrom > now || invitation.validUntil <= now) {
      await this.createDeniedAccessLog({
        communityId: invitation.communityId,
        homeId: invitation.homeId,
        invitationId: invitation.id,
        qrTokenId: qrToken.id,
        guardId: currentUser.sub,
        visitorName: invitation.visitorName,
        deniedReason: 'Invitation is outside valid time range',
      });

      throw new BadRequestException('Invitation is outside valid time range');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      await this.createDeniedAccessLog({
        communityId: invitation.communityId,
        homeId: invitation.homeId,
        invitationId: invitation.id,
        qrTokenId: qrToken.id,
        guardId: currentUser.sub,
        visitorName: invitation.visitorName,
        deniedReason: 'Invitation max uses reached',
      });

      throw new BadRequestException('Invitation max uses reached');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedQrToken = await tx.qrToken.update({
        where: {
          id: qrToken.id,
        },
        data: {
          status: QrTokenStatus.USED,
          usedAt: now,
        },
        select: {
          id: true,
          status: true,
          usedAt: true,
          expiresAt: true,
        },
      });

      const updatedInvitation = await tx.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          usedCount: {
            increment: 1,
          },
          status: InvitationStatus.USED,
        },
        select: {
          id: true,
          status: true,
          visitorName: true,
          usedCount: true,
          maxUses: true,
        },
      });

      const accessLog = await tx.accessLog.create({
        data: {
          communityId: invitation.communityId,
          homeId: invitation.homeId,
          invitationId: invitation.id,
          qrTokenId: qrToken.id,
          guardId: currentUser.sub,
          direction: AccessDirection.ENTRY,
          method: AccessMethod.QR,
          result: AccessResult.ALLOWED,
          visitorName: invitation.visitorName,
          notes: 'QR validated successfully',
        },
        select: this.getAccessLogSelect(),
      });

      const gateDevice = await tx.device.findFirst({
        where: {
          communityId: invitation.communityId,
          type: DeviceType.GATE,
          status: DeviceStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const gateCommand = await tx.gateCommand.create({
        data: {
          communityId: invitation.communityId,
          deviceId: gateDevice?.id,
          accessLogId: accessLog.id,
          type: GateCommandType.OPEN,
          status: GateCommandStatus.SIMULATED,
          payload: {
            reason: 'QR_ACCESS_GRANTED',
            visitorName: invitation.visitorName,
            homeId: invitation.homeId,
            simulated: true,
          },
          response: {
            message: 'Gate opening simulated',
          },
          completedAt: now,
        },
        select: {
          id: true,
          deviceId: true,
          accessLogId: true,
          type: true,
          status: true,
          payload: true,
          response: true,
          requestedAt: true,
          completedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          communityId: invitation.communityId,
          actorId: currentUser.sub,
          action: 'QR_ACCESS_GRANTED',
          entityType: 'AccessLog',
          entityId: accessLog.id,
          metadata: {
            invitationId: invitation.id,
            qrTokenId: qrToken.id,
            gateCommandId: gateCommand.id,
            visitorName: invitation.visitorName,
          },
        },
      });

      return {
        accessLog,
        gateCommand,
        invitation: updatedInvitation,
        qrToken: updatedQrToken,
      };
    });

    return {
      result: 'ALLOWED',
      message: 'QR validated successfully. Gate opening simulated.',
      ...result,
    };
  }

  async manualEntry(currentUser: JwtPayload, dto: ManualEntryDto) {
    if (
      currentUser.role !== UserRole.GUARD &&
      currentUser.role !== UserRole.COMMUNITY_ADMIN
    ) {
      throw new ForbiddenException('Only guards can register manual entries');
    }

    if (!currentUser.communityId) {
      throw new ForbiddenException('User has no community assigned');
    }

    const home = await this.prisma.home.findUnique({
      where: {
        id: dto.homeId,
      },
    });

    if (!home) {
      throw new NotFoundException('Home not found');
    }

    if (home.communityId !== currentUser.communityId) {
      throw new ForbiddenException('Home belongs to another community');
    }

    if (!home.isActive) {
      throw new BadRequestException('Home is inactive');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const accessLog = await tx.accessLog.create({
        data: {
          communityId: home.communityId,
          homeId: home.id,
          guardId: currentUser.sub,
          direction: AccessDirection.ENTRY,
          method: AccessMethod.MANUAL,
          result: AccessResult.ALLOWED,
          visitorName: dto.visitorName,
          notes:
            dto.notes ??
            'Manual entry registered by guard without QR invitation',
        },
        select: this.getAccessLogSelect(),
      });

      const gateDevice = await tx.device.findFirst({
        where: {
          communityId: home.communityId,
          type: DeviceType.GATE,
          status: DeviceStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const gateCommand = await tx.gateCommand.create({
        data: {
          communityId: home.communityId,
          deviceId: gateDevice?.id,
          accessLogId: accessLog.id,
          type: GateCommandType.OPEN,
          status: GateCommandStatus.SIMULATED,
          payload: {
            reason: 'MANUAL_ENTRY_AUTHORIZED',
            visitorName: dto.visitorName,
            visitorPhone: dto.visitorPhone,
            visitorCompany: dto.visitorCompany,
            homeId: home.id,
            simulated: true,
          },
          response: {
            message: 'Manual entry gate opening simulated',
          },
          completedAt: now,
        },
        select: {
          id: true,
          deviceId: true,
          accessLogId: true,
          type: true,
          status: true,
          payload: true,
          response: true,
          requestedAt: true,
          completedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          communityId: home.communityId,
          actorId: currentUser.sub,
          action: 'MANUAL_ENTRY_AUTHORIZED',
          entityType: 'AccessLog',
          entityId: accessLog.id,
          metadata: {
            homeId: home.id,
            visitorName: dto.visitorName,
            visitorPhone: dto.visitorPhone,
            visitorCompany: dto.visitorCompany,
            gateCommandId: gateCommand.id,
            reason: dto.notes,
          },
        },
      });

      return {
        accessLog,
        gateCommand,
      };
    });

    return {
      result: 'ALLOWED',
      message: 'Manual entry registered successfully. Gate opening simulated.',
      ...result,
    };
  }
   
  async registerExit(
    currentUser: JwtPayload,
    entryLogId: string,
    dto: RegisterExitDto,
  ) {
    if (
      currentUser.role !== UserRole.GUARD &&
      currentUser.role !== UserRole.COMMUNITY_ADMIN
    ) {
      throw new ForbiddenException('Only guards can register exits');
    }

    if (!currentUser.communityId) {
      throw new ForbiddenException('User has no community assigned');
    }

    const entryLog = await this.prisma.accessLog.findUnique({
      where: {
        id: entryLogId,
      },
    });

    if (!entryLog) {
      throw new NotFoundException('Entry access log not found');
    }

    if (entryLog.communityId !== currentUser.communityId) {
      throw new ForbiddenException('Access log belongs to another community');
    }

    if (entryLog.direction !== AccessDirection.ENTRY) {
      throw new BadRequestException('Access log is not an entry log');
    }

    if (entryLog.result !== AccessResult.ALLOWED) {
      throw new BadRequestException('Only allowed entries can be closed');
    }

    if (!entryLog.invitationId || !entryLog.qrTokenId) {
      throw new BadRequestException(
        'Only QR-based entries can be closed for now',
      );
    }

    const existingExit = await this.prisma.accessLog.findFirst({
      where: {
        invitationId: entryLog.invitationId,
        qrTokenId: entryLog.qrTokenId,
        direction: AccessDirection.EXIT,
        result: AccessResult.ALLOWED,
      },
    });

    if (existingExit) {
      throw new BadRequestException('Exit already registered for this entry');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const exitLog = await tx.accessLog.create({
        data: {
          communityId: entryLog.communityId,
          homeId: entryLog.homeId,
          invitationId: entryLog.invitationId,
          qrTokenId: entryLog.qrTokenId,
          guardId: currentUser.sub,
          direction: AccessDirection.EXIT,
          method: AccessMethod.MANUAL,
          result: AccessResult.ALLOWED,
          visitorName: entryLog.visitorName,
          notes: dto.notes ?? 'Manual exit registered by guard',
        },
        select: this.getAccessLogSelect(),
      });

      const gateDevice = await tx.device.findFirst({
        where: {
          communityId: entryLog.communityId,
          type: DeviceType.GATE,
          status: DeviceStatus.ACTIVE,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const gateCommand = await tx.gateCommand.create({
        data: {
          communityId: entryLog.communityId,
          deviceId: gateDevice?.id,
          accessLogId: exitLog.id,
          type: GateCommandType.OPEN,
          status: GateCommandStatus.SIMULATED,
          payload: {
            reason: 'MANUAL_EXIT_REGISTERED',
            visitorName: entryLog.visitorName,
            homeId: entryLog.homeId,
            simulated: true,
          },
          response: {
            message: 'Exit gate opening simulated',
          },
          completedAt: now,
        },
        select: {
          id: true,
          deviceId: true,
          accessLogId: true,
          type: true,
          status: true,
          payload: true,
          response: true,
          requestedAt: true,
          completedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          communityId: entryLog.communityId,
          actorId: currentUser.sub,
          action: 'ACCESS_EXIT_REGISTERED',
          entityType: 'AccessLog',
          entityId: exitLog.id,
          metadata: {
            entryLogId: entryLog.id,
            invitationId: entryLog.invitationId,
            qrTokenId: entryLog.qrTokenId,
            gateCommandId: gateCommand.id,
            visitorName: entryLog.visitorName,
          },
        },
      });

      return {
        exitLog,
        gateCommand,
      };
    });

    return {
      result: 'ALLOWED',
      message: 'Exit registered successfully. Gate opening simulated.',
      ...result,
    };
  }

  async findAll(currentUser: JwtPayload) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.accessLog.findMany({
        orderBy: {
          occurredAt: 'desc',
        },
        select: this.getAccessLogSelect(),
      });
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      return this.prisma.accessLog.findMany({
        where: {
          communityId: currentUser.communityId,
        },
        orderBy: {
          occurredAt: 'desc',
        },
        select: this.getAccessLogSelect(),
      });
    }

    throw new ForbiddenException('Insufficient role');
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const accessLog = await this.prisma.accessLog.findUnique({
      where: {
        id,
      },
      select: this.getAccessLogSelect(),
    });

    if (!accessLog) {
      throw new NotFoundException('Access log not found');
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return accessLog;
    }

    if (
      currentUser.role === UserRole.COMMUNITY_ADMIN ||
      currentUser.role === UserRole.GUARD
    ) {
      if (!currentUser.communityId) {
        throw new ForbiddenException('User has no community assigned');
      }

      if (accessLog.communityId !== currentUser.communityId) {
        throw new ForbiddenException('Access log belongs to another community');
      }

      return accessLog;
    }

    throw new ForbiddenException('Insufficient role');
  }

  private async createDeniedAccessLog(params: {
    communityId: string;
    homeId: string;
    invitationId: string;
    qrTokenId: string;
    guardId: string;
    visitorName: string;
    deniedReason: string;
  }) {
    return this.prisma.accessLog.create({
      data: {
        communityId: params.communityId,
        homeId: params.homeId,
        invitationId: params.invitationId,
        qrTokenId: params.qrTokenId,
        guardId: params.guardId,
        direction: AccessDirection.ENTRY,
        method: AccessMethod.QR,
        result: AccessResult.DENIED,
        visitorName: params.visitorName,
        deniedReason: params.deniedReason,
      },
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private getAccessLogSelect() {
    return {
      id: true,
      communityId: true,
      homeId: true,
      invitationId: true,
      qrTokenId: true,
      guardId: true,
      direction: true,
      method: true,
      result: true,
      visitorName: true,
      notes: true,
      deniedReason: true,
      occurredAt: true,
      createdAt: true,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
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
      invitation: {
        select: {
          id: true,
          status: true,
          visitorName: true,
          type: true,
          validFrom: true,
          validUntil: true,
        },
      },
      guard: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      gateCommands: {
        select: {
          id: true,
          deviceId: true,
          type: true,
          status: true,
          requestedAt: true,
          completedAt: true,
        },
      },
    };
  }
}