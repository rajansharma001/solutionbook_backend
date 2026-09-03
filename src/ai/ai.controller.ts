import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('chat')
  async chat(@Body() dto: { prompt: string; context?: string }) {
    const reply = await this.aiService.chat(dto.prompt, dto.context);
    return { reply };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('summarize')
  async summarize(@Body() dto: { content: string }) {
    const summary = await this.aiService.generateLessonSummary(dto.content);
    return { summary };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('flashcards')
  async flashcards(@Body() dto: { content: string }) {
    const cards = await this.aiService.generateFlashcards(dto.content);
    return { cards };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('study-plan')
  async studyPlan(@Body() dto: { goal: string; hours: number }) {
    const plan = await this.aiService.generateStudyPlan(dto.goal, dto.hours);
    return { plan };
  }
}
