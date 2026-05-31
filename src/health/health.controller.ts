import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'hivegate-api',
      database: 'postgresql-local',
      timestamp: new Date().toISOString(),
    };
  }
}