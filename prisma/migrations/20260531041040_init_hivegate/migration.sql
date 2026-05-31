-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMMUNITY_ADMIN', 'RESIDENT_OWNER', 'RESIDENT_TENANT', 'RESIDENT_MEMBER', 'GUARD');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "HomeResidentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('GUEST', 'PROVIDER', 'DELIVERY', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "QrTokenStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccessDirection" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccessResult" AS ENUM ('ALLOWED', 'DENIED');

-- CreateEnum
CREATE TYPE "GuardShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('GATE', 'QR_SCANNER', 'MOBILE_DEVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "GateCommandType" AS ENUM ('OPEN', 'CLOSE', 'TEST');

-- CreateEnum
CREATE TYPE "GateCommandStatus" AS ENUM ('PENDING', 'SENT', 'SUCCESS', 'FAILED', 'SIMULATED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITATION_CREATED', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'GATE_COMMAND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "communityId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homes" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "block" TEXT,
    "lot" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_residents" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "HomeResidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT,
    "visitorCompany" TEXT,
    "notes" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_tokens" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "QrTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "homeId" TEXT,
    "invitationId" TEXT,
    "qrTokenId" TEXT,
    "guardId" TEXT,
    "direction" "AccessDirection" NOT NULL,
    "method" "AccessMethod" NOT NULL,
    "result" "AccessResult" NOT NULL,
    "visitorName" TEXT,
    "notes" TEXT,
    "deniedReason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard_shifts" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "guardId" TEXT NOT NULL,
    "status" "GuardShiftStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guard_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "identifier" TEXT,
    "location" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_commands" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "deviceId" TEXT,
    "accessLogId" TEXT,
    "type" "GateCommandType" NOT NULL,
    "status" "GateCommandStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "response" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "communityId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_settings" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_communityId_idx" ON "users"("communityId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "homes_communityId_idx" ON "homes"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "homes_communityId_code_key" ON "homes"("communityId", "code");

-- CreateIndex
CREATE INDEX "home_residents_homeId_idx" ON "home_residents"("homeId");

-- CreateIndex
CREATE INDEX "home_residents_userId_idx" ON "home_residents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "home_residents_homeId_userId_key" ON "home_residents"("homeId", "userId");

-- CreateIndex
CREATE INDEX "invitations_communityId_idx" ON "invitations"("communityId");

-- CreateIndex
CREATE INDEX "invitations_homeId_idx" ON "invitations"("homeId");

-- CreateIndex
CREATE INDEX "invitations_createdById_idx" ON "invitations"("createdById");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tokens_tokenHash_key" ON "qr_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "qr_tokens_invitationId_idx" ON "qr_tokens"("invitationId");

-- CreateIndex
CREATE INDEX "qr_tokens_status_idx" ON "qr_tokens"("status");

-- CreateIndex
CREATE INDEX "access_logs_communityId_idx" ON "access_logs"("communityId");

-- CreateIndex
CREATE INDEX "access_logs_homeId_idx" ON "access_logs"("homeId");

-- CreateIndex
CREATE INDEX "access_logs_invitationId_idx" ON "access_logs"("invitationId");

-- CreateIndex
CREATE INDEX "access_logs_qrTokenId_idx" ON "access_logs"("qrTokenId");

-- CreateIndex
CREATE INDEX "access_logs_guardId_idx" ON "access_logs"("guardId");

-- CreateIndex
CREATE INDEX "access_logs_occurredAt_idx" ON "access_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "guard_shifts_communityId_idx" ON "guard_shifts"("communityId");

-- CreateIndex
CREATE INDEX "guard_shifts_guardId_idx" ON "guard_shifts"("guardId");

-- CreateIndex
CREATE INDEX "guard_shifts_status_idx" ON "guard_shifts"("status");

-- CreateIndex
CREATE INDEX "devices_communityId_idx" ON "devices"("communityId");

-- CreateIndex
CREATE INDEX "devices_type_idx" ON "devices"("type");

-- CreateIndex
CREATE INDEX "gate_commands_communityId_idx" ON "gate_commands"("communityId");

-- CreateIndex
CREATE INDEX "gate_commands_deviceId_idx" ON "gate_commands"("deviceId");

-- CreateIndex
CREATE INDEX "gate_commands_accessLogId_idx" ON "gate_commands"("accessLogId");

-- CreateIndex
CREATE INDEX "gate_commands_status_idx" ON "gate_commands"("status");

-- CreateIndex
CREATE INDEX "audit_logs_communityId_idx" ON "audit_logs"("communityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_communityId_idx" ON "notifications"("communityId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "community_settings_communityId_idx" ON "community_settings"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "community_settings_communityId_key_key" ON "community_settings"("communityId", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homes" ADD CONSTRAINT "homes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_residents" ADD CONSTRAINT "home_residents_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_residents" ADD CONSTRAINT "home_residents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guard_shifts" ADD CONSTRAINT "guard_shifts_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guard_shifts" ADD CONSTRAINT "guard_shifts_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_accessLogId_fkey" FOREIGN KEY ("accessLogId") REFERENCES "access_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_settings" ADD CONSTRAINT "community_settings_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
