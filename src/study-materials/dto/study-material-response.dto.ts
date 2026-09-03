import { Exclude, Expose } from 'class-transformer';
import { StudyMaterialCategory, StudyMaterialStatus } from '../../common/enums';

@Exclude()
export class StudyMaterialResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() description?: string;
  @Expose() fileUrl: string;
  @Expose() category: StudyMaterialCategory | string;
  @Expose() classLevel?: string;
  @Expose() subject?: string;
  @Expose() program?: string;
  @Expose() tags?: string;
  @Expose() downloadCount: number;
  @Expose() authorId?: string;
  @Expose() status: StudyMaterialStatus | string;
  @Expose() isFree: boolean;
  @Expose() price: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
