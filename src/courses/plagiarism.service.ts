import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async checkSubmission(submissionId: string, content: string): Promise<number | null> {
    try {
      this.logger.log(`Running plagiarism check for submission: ${submissionId}`);

      // If content is too short, just return a perfect score
      if (!content || content.length < 50) {
        return 100.0;
      }

      // We use the AI service to evaluate originality
      const prompt = `You are a plagiarism detection engine.
Evaluate the following student submission for originality.
Return ONLY a valid JSON object with a single key "originalityScore" containing a float between 0.0 and 100.0.
A score of 100.0 means completely original, 0.0 means completely copied.
Text to evaluate:
"""
${content.substring(0, 5000)}
"""
`;

      const response = await this.aiService.chat(prompt, 'You are an exact JSON output API.');
      
      let text = response.trim();
      if (text.startsWith('```json')) text = text.replace(/^```json/, '');
      if (text.startsWith('```')) text = text.replace(/^```/, '');
      if (text.endsWith('```')) text = text.replace(/```$/, '');

      let score: number | null = null;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.originalityScore === 'number') {
          score = parsed.originalityScore;
        }
      } catch (e) {
        this.logger.warn(`Failed to parse originality score: ${text}`);
      }

      if (score !== null) {
        // Save the score
        await this.prisma.assignmentSubmission.update({
          where: { id: submissionId },
          data: { plagiarismScore: score } as any, // Cast to any to bypass TS if prisma client is stale
        });
        this.logger.log(`Originality score for ${submissionId}: ${score}`);
      }

      return score;
    } catch (error) {
      this.logger.error(`Error checking plagiarism: ${(error as Error).message}`);
      return null;
    }
  }
}
