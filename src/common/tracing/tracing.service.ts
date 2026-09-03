import { Injectable } from '@nestjs/common';
import { trace, Span, SpanStatusCode, SpanKind, Context, context, Attributes } from '@opentelemetry/api';

@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer('solutionbook-api');

  startSpan(name: string, options?: { kind?: SpanKind; attributes?: Attributes; parentContext?: Context }): Span {
    const parentContext = options?.parentContext || context.active();
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    }, parentContext);
    return span;
  }

  async runInSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: { kind?: SpanKind; attributes?: Attributes },
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  async runInSpanSync<T>(
    name: string,
    fn: (span: Span) => T,
    options?: { kind?: SpanKind; attributes?: Attributes },
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  addAttributes(span: Span, attributes: Attributes): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value);
      }
    });
  }

  addEvent(span: Span, name: string, attributes?: Attributes): void {
    span.addEvent(name, attributes);
  }

  getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  setSpanStatus(span: Span, code: SpanStatusCode, message?: string): void {
    span.setStatus({ code, message });
  }
}