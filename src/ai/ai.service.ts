import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async getGenAI(): Promise<GoogleGenerativeAI | null> {
    const setting = await this.settingsService.getSetting('GEMINI_API_KEY');
    const apiKey = setting?.value || process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() !== '') {
      return new GoogleGenerativeAI(apiKey.trim());
    }

    this.logger.warn('GEMINI_API_KEY is missing. AI features will run in mock/fallback mode.');
    return null;
  }

  async chat(prompt: string, context?: string): Promise<string> {
    const genAI = await this.getGenAI();
    if (!genAI) {
      this.logger.warn(
        'AI chat requested but GEMINI_API_KEY is not set. Returning fallback.',
      );
      return 'AI service is currently not configured. Please ask the administrator to configure the API key in the admin dashboard settings.';
    }

    try {
      // Use gemini-1.5-flash as requested
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: context
          ? `You are SolutionBook AI Tutor, a helpful educational assistant. ${context}`
          : 'You are SolutionBook AI Tutor, a helpful educational assistant for Nepali students. Answer questions clearly and concisely. Use simple language. If asked about a topic, provide explanations with examples.',
      });

      const response = await model.generateContent(prompt);
      return (
        response.response.text() || 'Sorry, I could not generate a response.'
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`AI chat error: ${err?.message}`, err?.stack);
      return 'Sorry, an error occurred while connecting to the AI brain. Please try again later.';
    }
  }

  async generateLessonSummary(content: string): Promise<string> {
    const genAI = await this.getGenAI();
    if (!genAI) return 'AI service is currently not configured.';
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
          'You are an expert tutor. Given a lesson text, extract the key points, core concepts, and provide a short, highly readable summary in Markdown. Use bullet points and bold text for emphasis.',
      });
      const response = await model.generateContent(
        `Summarize this lesson content:\n\n${content}`,
      );
      return response.response.text() || 'Could not generate summary.';
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Summary error: ${err?.message}`, err?.stack);
      return 'Error generating summary.';
    }
  }

  async generateFlashcards(content: string): Promise<Record<string, unknown>[]> {
    const genAI = await this.getGenAI();
    if (!genAI) return [];
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
          'You are an expert tutor. Create 3 to 5 Question and Answer flashcards from the provided text. Return ONLY a valid JSON array of objects with "question" and "answer" keys. Do NOT wrap it in markdown block quotes (no ```json or ```). Just return the raw JSON array string.',
      });
      const response = await model.generateContent(
        `Generate flashcards for this text:\n\n${content}`,
      );
      let text = response.response.text().trim();
      if (text.startsWith('```json')) text = text.replace(/^```json/, '');
      if (text.startsWith('```')) text = text.replace(/^```/, '');
      if (text.endsWith('```')) text = text.replace(/```$/, '');
      return JSON.parse(text.trim());
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Flashcards error: ${err?.message}`, err?.stack);
      return [];
    }
  }

  async generateStudyPlan(goal: string, hoursPerWeek: number): Promise<string> {
    const genAI = await this.getGenAI();
    if (!genAI) return 'AI service is currently not configured.';
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
          "You are an expert academic advisor. Create a structured, day-by-day study plan in Markdown format based on the user's goal and available hours. Use headings, bullet points, and checkboxes.",
      });
      const response = await model.generateContent(
        `My goal is: ${goal}. I can study ${hoursPerWeek} hours per week. Please give me a detailed weekly schedule.`,
      );
      return response.response.text() || 'Could not generate plan.';
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Study plan error: ${err?.message}`, err?.stack);
      return 'Error generating study plan.';
    }
  }
}
