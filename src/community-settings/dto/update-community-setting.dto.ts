import { IsDefined } from 'class-validator';

export class UpdateCommunitySettingDto {
  @IsDefined()
  value!: unknown;
}