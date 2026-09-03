import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AdminModule } from './admin/admin.module';
import { StudyMaterialsModule } from './study-materials/study-materials.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { RevenueModule } from './revenue/revenue.module';
import { LiveModule } from './live/live.module';
import { ChatModule } from './chat/chat.module';
import { MediaModule } from './media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CertificatesModule } from './certificates/certificates.module';
import { GamificationModule } from './gamification/gamification.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { BlogsModule } from './blogs/blogs.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AiModule } from './ai/ai.module';
import { KeepAliveService } from './common/services/keep-alive.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot(),
    PrismaModule,
    UsersModule,
    MailModule,
    AuthModule,
    CoursesModule,
    EnrollmentsModule,
    AdminModule,
    StudyMaterialsModule,
    SettingsModule,
    NotificationsModule,
    PaymentsModule,
    RevenueModule,
    LiveModule,
    ChatModule,
    MediaModule,
    AnalyticsModule,
    CertificatesModule,
    GamificationModule,
    InstitutionsModule,
    TaxonomyModule,
    BlogsModule,
    BookmarksModule,
    FeedbackModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService, KeepAliveService],
})
export class AppModule {}
