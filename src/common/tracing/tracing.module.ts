import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { TracingService } from './tracing.service';

@Global()
@Module({
  providers: [
    {
      provide: 'TRACER_PROVIDER',
      useFactory: (config: ConfigService) => {
        const resource = resourceFromAttributes({
          [SemanticResourceAttributes.SERVICE_NAME]: config.get('OTEL_SERVICE_NAME') || 'solutionbook-api',
          [SemanticResourceAttributes.SERVICE_VERSION]: config.get('OTEL_SERVICE_VERSION') || '1.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.get('NODE_ENV') || 'development',
        });
        
        const provider = new NodeTracerProvider({
          resource,
        });

        const otlpEndpoint = config.get('OTEL_EXPORTER_OTLP_ENDPOINT');
        if (otlpEndpoint) {
          const exporter = new OTLPTraceExporter({
            url: `${otlpEndpoint}/v1/traces`,
          });
          const processor = new BatchSpanProcessor(exporter);
          // NodeTracerProvider extends BaseTracerProvider which has addSpanProcessor
          (provider as any).addSpanProcessor(processor);
        }

        provider.register();

        registerInstrumentations({
          instrumentations: [
            new HttpInstrumentation(),
            new ExpressInstrumentation(),
            new PgInstrumentation(),
            new RedisInstrumentation(),
            new NestInstrumentation(),
          ],
        });

        return provider;
      },
      inject: [ConfigService],
    },
    TracingService,
  ],
  exports: ['TRACER_PROVIDER', TracingService],
})
export class TracingModule implements OnModuleInit, OnModuleDestroy {
  onModuleInit(): void {
    // Tracing is initialized in the factory
  }

  onModuleDestroy(): void {
    // Cleanup if needed
  }
}