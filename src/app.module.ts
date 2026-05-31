import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccessLogsModule } from './access-logs/access-logs.module';
import { AuthModule } from './auth/auth.module';
import { CommunitiesModule } from './communities/communities.module';
import { HealthModule } from './health/health.module';
import { HomesModule } from './homes/homes.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,

    HealthModule,
    AuthModule,
    UsersModule,
    CommunitiesModule,
    HomesModule,
    InvitationsModule,
    AccessLogsModule,
  ],
})
export class AppModule {}