import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';
import { Transform } from 'class-transformer';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

type SanitizeProfile = 'rich' | 'short' | 'user' | 'minimal';

const SANITIZE_CONFIGS: Record<SanitizeProfile, Record<string, unknown>> = {
  rich: {
    USE_PROFILES: { html: true },
    KEEP_CONTENT: true,
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'hr',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'target', 'rel', 'style',
      'colspan', 'rowspan',
    ],
  },
  short: {
    USE_PROFILES: { html: true },
    KEEP_CONTENT: true,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  },
  user: {
    USE_PROFILES: { html: true },
    KEEP_CONTENT: true,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  },
  minimal: {
    USE_PROFILES: { html: true },
    KEEP_CONTENT: true,
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
  },
};

export function sanitize(value: string, profile: SanitizeProfile = 'minimal'): string {
  if (!value || typeof value !== 'string') return value;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (purify as any).sanitize(value, SANITIZE_CONFIGS[profile]);
  } catch {
    return value;
  }
}

export function sanitizeRich(value: string): string {
  return sanitize(value, 'rich');
}

export function sanitizeShort(value: string): string {
  return sanitize(value, 'short');
}

export function sanitizeUserContent(value: string): string {
  return sanitize(value, 'user');
}

export function SanitizeRich() {
  return Transform(({ value }: { value: string }) => sanitizeRich(value));
}

export function SanitizeShort() {
  return Transform(({ value }: { value: string }) => sanitizeShort(value));
}

export function SanitizeUserContent() {
  return Transform(({ value }: { value: string }) => sanitizeUserContent(value));
}

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform<string, string> {
  private readonly logger = new Logger(SanitizeHtmlPipe.name);

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    const metadataType = (metadata.metatype?.name || metadata.data || '').toLowerCase();
    let profile: SanitizeProfile = 'minimal';

    switch (metadataType) {
      case 'content':
      case 'description':
      case 'lessoncontent':
      case 'coursedescription':
        profile = 'rich';
        break;
      case 'shortdescription':
      case 'subtitle':
      case 'summary':
        profile = 'short';
        break;
      case 'comment':
      case 'review':
      case 'feedback':
      case 'message':
        profile = 'user';
        break;
    }

    try {
      return sanitize(value, profile);
    } catch (error) {
      this.logger.error(`HTML sanitization failed for ${metadataType}: ${(error as Error).message}`);
      throw new BadRequestException('Invalid HTML content');
    }
  }
}

export interface SanitizeHtmlOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  forbiddenTags?: string[];
  forbiddenAttributes?: string[];
}

export function createSanitizePipe(options: SanitizeHtmlOptions = {}) {
  const { allowedTags, allowedAttributes, forbiddenTags, forbiddenAttributes } = options;

  return class DynamicSanitizeHtmlPipe implements PipeTransform<string, string> {
    transform(value: string): string {
      if (!value || typeof value !== 'string') {
        return value;
      }

      try {
        const config: Record<string, unknown> = {
          USE_PROFILES: { html: true },
          KEEP_CONTENT: true,
          ALLOWED_TAGS: allowedTags || ['p', 'br', 'strong', 'em'],
          ALLOWED_ATTR: allowedAttributes || [],
          FORBID_TAGS: forbiddenTags || ['script', 'style', 'iframe', 'object', 'embed'],
          FORBID_ATTR: forbiddenAttributes || ['onerror', 'onload', 'onclick', 'onmouseover'],
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (purify as any).sanitize(value, config);
      } catch (error) {
        throw new BadRequestException('Invalid HTML content');
      }
    }
  };
}