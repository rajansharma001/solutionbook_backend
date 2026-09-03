import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AdminModule } from './admin/admin.module';
import { StudyMaterialsModule } from './study-materials/study-materials.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    MailModule,
    AuthModule,
    CoursesModule,
    EnrollmentsModule,
    AdminModule,
    StudyMaterialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

