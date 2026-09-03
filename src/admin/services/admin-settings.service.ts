import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getSettings() {
    const settings = await this.settingsService.getAllSettings();
    
    const defaults = {
      siteName: 'SolutionBook',
      contactEmail: 'admin@SolutionBook.local',
      contactPhone: '+977-1-4400000',
      contactAddress: 'Kathmandu, Nepal',
      logoText: 'SolutionBook',
      heroTitle: 'Master Your Exams with Expert-Crafted Learning',
      heroSubtitle:
        'Join 15,000+ students who are acing BLE, SEE, NEB, and Loksewa exams through our interactive courses, practice quizzes, and AI-powered tutoring on SolutionBook.',
      heroCtaText: 'Explore Courses',
      heroCtaLink: '/courses',
      commTitle: 'Join the Learning Community',
      commDescription:
        'Connect with thousands of students across Nepal. Discuss recent question papers, clear complex doubts, share exam preparation strategies, and prepare together.',
      commCtaText: 'Join Discord Server',
      commCtaLink: 'https://discord.gg/SolutionBook',
      commWhatsAppLink: 'https://chat.whatsapp.com/SolutionBook',
      features: [
        {
          title: 'Syllabus Aligned',
          desc: 'Every note, video, and quiz is strictly aligned with the latest CDC (Curriculum Development Centre) and Loksewa guidelines.',
        },
        {
          title: 'Gamified Practice',
          desc: 'Earn points for completing quizzes accurately and quickly. Level up your profile and climb the national leaderboards.',
        },
        {
          title: 'AI Course Tutor',
          desc: 'Stuck on a concept? Our AI tutor reads the specific course notes and explains it to you instantly, 24/7.',
        },
        {
          title: 'Past Paper Solutions',
          desc: 'Access 10+ years of BLE, SEE, and NEB past board questions with detailed, step-by-step verified solutions.',
        },
        {
          title: 'Learn Anywhere',
          desc: 'Fully responsive platform. Download PDF notes for offline reading or watch video lectures directly on your mobile.',
        },
        {
          title: 'Community Support',
          desc: 'Join course-specific chat rooms to discuss questions with peers or direct message your instructors for clarification.',
        },
      ],
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: true,
    };

    const dbSettings: Record<string, unknown> = {};
    for (const setting of settings) {
      if (setting.key.startsWith('ADMIN_')) {
        const key = setting.key.replace('ADMIN_', '').toLowerCase();
        try {
          dbSettings[key] = JSON.parse(setting.value);
        } catch {
          dbSettings[key] = setting.value;
        }
      }
    }

    const adminSettings = await Promise.all([
      this.settingsService.getSetting('requireEmailVerification'),
      this.settingsService.getSetting('allowRegistrations'),
      this.settingsService.getSetting('maintenanceMode'),
    ]);

    const merged = { ...defaults, ...dbSettings };
    if (adminSettings[0]) merged.requireEmailVerification = adminSettings[0].value === 'true';
    if (adminSettings[1]) merged.allowRegistrations = adminSettings[1].value === 'true';
    if (adminSettings[2]) merged.maintenanceMode = adminSettings[2].value === 'true';

    return merged;
  }

  async updateSettings(body: Record<string, unknown>) {
    const current = await this.getSettings();
    const updated = {
      siteName: body.siteName ?? current.siteName,
      contactEmail: body.contactEmail ?? current.contactEmail,
      contactPhone: body.contactPhone ?? current.contactPhone,
      contactAddress: body.contactAddress ?? current.contactAddress,
      logoText: body.logoText ?? current.logoText,
      heroTitle: body.heroTitle ?? current.heroTitle,
      heroSubtitle: body.heroSubtitle ?? current.heroSubtitle,
      heroCtaText: body.heroCtaText ?? current.heroCtaText,
      heroCtaLink: body.heroCtaLink ?? current.heroCtaLink,
      commTitle: body.commTitle ?? current.commTitle,
      commDescription: body.commDescription ?? current.commDescription,
      commCtaText: body.commCtaText ?? current.commCtaText,
      commCtaLink: body.commCtaLink ?? current.commCtaLink,
      commWhatsAppLink: body.commWhatsAppLink ?? current.commWhatsAppLink,
      features: body.features ?? current.features,
      maintenanceMode: body.maintenanceMode ?? current.maintenanceMode,
      allowRegistrations: body.allowRegistrations ?? current.allowRegistrations,
      requireEmailVerification:
        body.requireEmailVerification ?? current.requireEmailVerification,
    };

    const settingsToSave: Record<string, string> = {
      siteName: 'SITE_NAME',
      contactEmail: 'CONTACT_EMAIL',
      contactPhone: 'CONTACT_PHONE',
      contactAddress: 'CONTACT_ADDRESS',
      logoText: 'LOGO_TEXT',
      heroTitle: 'HERO_TITLE',
      heroSubtitle: 'HERO_SUBTITLE',
      heroCtaText: 'HERO_CTA_TEXT',
      heroCtaLink: 'HERO_CTA_LINK',
      commTitle: 'COMM_TITLE',
      commDescription: 'COMM_DESCRIPTION',
      commCtaText: 'COMM_CTA_TEXT',
      commCtaLink: 'COMM_CTA_LINK',
      commWhatsAppLink: 'COMM_WHATSAPP_LINK',
      features: 'FEATURES',
    };

    for (const [key, dbKey] of Object.entries(settingsToSave)) {
      const k = key as keyof typeof updated;
      await this.settingsService.setSetting(
        `ADMIN_${dbKey}`,
        JSON.stringify(updated[k]),
      );
    }

    await this.settingsService.setSetting('requireEmailVerification', String(updated.requireEmailVerification));
    await this.settingsService.setSetting('allowRegistrations', String(updated.allowRegistrations));
    await this.settingsService.setSetting('maintenanceMode', String(updated.maintenanceMode));

    return updated;
  }
}