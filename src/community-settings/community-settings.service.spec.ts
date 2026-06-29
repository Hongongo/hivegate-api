import { Test, TestingModule } from '@nestjs/testing';
import { CommunitySettingsService } from './community-settings.service';

describe('CommunitySettingsService', () => {
  let service: CommunitySettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunitySettingsService],
    }).compile();

    service = module.get<CommunitySettingsService>(CommunitySettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
