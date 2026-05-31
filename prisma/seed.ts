import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  DeviceStatus,
  DeviceType,
  HomeResidentStatus,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('Starting HiveGate seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const community = await prisma.community.upsert({
    where: {
      slug: 'hivegate-demo',
    },
    update: {},
    create: {
      name: 'Residencial HiveGate Demo',
      slug: 'hivegate-demo',
      address: 'Dirección demo, México',
      isActive: true,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: {
      email: 'superadmin@hivegate.local',
    },
    update: {},
    create: {
      email: 'superadmin@hivegate.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const communityAdmin = await prisma.user.upsert({
    where: {
      email: 'admin@hivegate.local',
    },
    update: {},
    create: {
      communityId: community.id,
      email: 'admin@hivegate.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Comunidad',
      role: UserRole.COMMUNITY_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const guard = await prisma.user.upsert({
    where: {
      email: 'guard@hivegate.local',
    },
    update: {},
    create: {
      communityId: community.id,
      email: 'guard@hivegate.local',
      passwordHash,
      firstName: 'Guardia',
      lastName: 'Demo',
      role: UserRole.GUARD,
      status: UserStatus.ACTIVE,
    },
  });

  const resident = await prisma.user.upsert({
    where: {
      email: 'resident@hivegate.local',
    },
    update: {},
    create: {
      communityId: community.id,
      email: 'resident@hivegate.local',
      passwordHash,
      firstName: 'Residente',
      lastName: 'Demo',
      phone: '9999999999',
      role: UserRole.RESIDENT_OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  const home = await prisma.home.upsert({
    where: {
      communityId_code: {
        communityId: community.id,
        code: 'A-101',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      code: 'A-101',
      street: 'Calle Abeja',
      number: '101',
      block: 'A',
      lot: '101',
      notes: 'Casa demo principal',
      isActive: true,
    },
  });

  await prisma.homeResident.upsert({
    where: {
      homeId_userId: {
        homeId: home.id,
        userId: resident.id,
      },
    },
    update: {},
    create: {
      homeId: home.id,
      userId: resident.id,
      status: HomeResidentStatus.ACTIVE,
      isPrimary: true,
    },
  });

  await prisma.device.create({
    data: {
      communityId: community.id,
      name: 'Pluma Principal Simulada',
      type: DeviceType.GATE,
      status: DeviceStatus.ACTIVE,
      identifier: 'SIM-GATE-001',
      location: 'Entrada principal',
      isSimulated: true,
    },
  });

  await prisma.communitySetting.upsert({
    where: {
      communityId_key: {
        communityId: community.id,
        key: 'qrExpirationMinutes',
      },
    },
    update: {
      value: 60,
    },
    create: {
      communityId: community.id,
      key: 'qrExpirationMinutes',
      value: 60,
    },
  });

  await prisma.communitySetting.upsert({
    where: {
      communityId_key: {
        communityId: community.id,
        key: 'allowManualAccess',
      },
    },
    update: {
      value: true,
    },
    create: {
      communityId: community.id,
      key: 'allowManualAccess',
      value: true,
    },
  });

  await prisma.communitySetting.upsert({
    where: {
      communityId_key: {
        communityId: community.id,
        key: 'gateMode',
      },
    },
    update: {
      value: 'simulated',
    },
    create: {
      communityId: community.id,
      key: 'gateMode',
      value: 'simulated',
    },
  });

  console.log('HiveGate seed completed.');
  console.log('');
  console.log('Demo users:');
  console.log('superadmin@hivegate.local / Password123!');
  console.log('admin@hivegate.local / Password123!');
  console.log('guard@hivegate.local / Password123!');
  console.log('resident@hivegate.local / Password123!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });