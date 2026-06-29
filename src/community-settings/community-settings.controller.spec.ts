import { Test, TestingModule } from '@nestjs/testing';
import { CommunitySettingsController } from './community-settings.controller';

describe('CommunitySettingsController', () => {
  let controller: CommunitySettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunitySettingsController],
    }).compile();

    controller = module.get<CommunitySettingsController>(CommunitySettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
