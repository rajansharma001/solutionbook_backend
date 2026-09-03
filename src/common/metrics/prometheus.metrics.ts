import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusMetricsService implements OnModuleInit {
  private readonly registry: Registry;
  
  // HTTP Metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsInFlight: Gauge<string>;

  // Business Metrics
  public readonly usersTotal: Gauge<string>;
  public readonly coursesTotal: Gauge<string>;
  public readonly enrollmentsTotal: Gauge<string>;
  public readonly paymentsTotal: Counter<string>;
  public readonly certificatesIssued: Counter<string>;
  public readonly activeSessions: Gauge<string>;

  // System Metrics
  public readonly memoryUsage: Gauge<string>;
  public readonly cpuUsage: Gauge<string>;
  public readonly eventLoopLag: Gauge<string>;

  // Error Metrics
  public readonly errorsTotal: Counter<string>;
  public readonly rateLimitExceeded: Counter<string>;
  public readonly authFailures: Counter<string>;

  // WebSocket Metrics
  public readonly wsConnections: Gauge<string>;
  public readonly wsMessagesTotal: Counter<string>;
  public readonly wsErrorsTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();
    
    // Add default Node.js metrics (memory, CPU, event loop, etc.)
    collectDefaultMetrics({ 
      register: this.registry,
      prefix: 'nodejs_',
    });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    // Business Metrics
    this.usersTotal = new Gauge({
      name: 'users_total',
      help: 'Total number of users',
      labelNames: ['role'],
      registers: [this.registry],
    });

    this.coursesTotal = new Gauge({
      name: 'courses_total',
      help: 'Total number of courses',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.enrollmentsTotal = new Gauge({
      name: 'enrollments_total',
      help: 'Total number of enrollments',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.paymentsTotal = new Counter({
      name: 'payments_total',
      help: 'Total number of payments',
      labelNames: ['type', 'status', 'payment_method'],
      registers: [this.registry],
    });

    this.certificatesIssued = new Counter({
      name: 'certificates_issued_total',
      help: 'Total number of certificates issued',
      labelNames: ['course_id'],
      registers: [this.registry],
    });

    this.activeSessions = new Gauge({
      name: 'active_sessions',
      help: 'Number of active user sessions',
      registers: [this.registry],
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: 'process_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'process_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.registry],
    });

    this.eventLoopLag = new Gauge({
      name: 'event_loop_lag_ms',
      help: 'Event loop lag in milliseconds',
      registers: [this.registry],
    });

    // Error Metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'route'],
      registers: [this.registry],
    });

    this.rateLimitExceeded = new Counter({
      name: 'rate_limit_exceeded_total',
      help: 'Total number of rate limit exceeded events',
      labelNames: ['endpoint', 'ip'],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // WebSocket Metrics
    this.wsConnections = new Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
      registers: [this.registry],
    });

    this.wsMessagesTotal = new Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['namespace', 'event', 'direction'],
      registers: [this.registry],
    });

    this.wsErrorsTotal = new Counter({
      name: 'websocket_errors_total',
      help: 'Total number of WebSocket errors',
      labelNames: ['namespace', 'event'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    // Start periodic system metrics collection
    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      // CPU usage (approximate)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
      this.cpuUsage.set(cpuPercent);
    }, 10000); // Every 10 seconds
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getContentType(): Promise<string> {
    return this.registry.contentType;
  }

  // Helper methods for incrementing metrics
  incrementHttpRequest(method: string, route: string, statusCode: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeHttpRequestDuration(method: string, route: string, statusCode: number, durationSeconds: number): void {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
  }

  incrementHttpInFlight(method: string, route: string): void {
    this.httpRequestsInFlight.inc({ method, route });
  }

  decrementHttpInFlight(method: string, route: string): void {
    this.httpRequestsInFlight.dec({ method, route });
  }

  setUsersTotal(role: string, count: number): void {
    this.usersTotal.set({ role }, count);
  }

  setCoursesTotal(status: string, count: number): void {
    this.coursesTotal.set({ status }, count);
  }

  setEnrollmentsTotal(status: string, count: number): void {
    this.enrollmentsTotal.set({ status }, count);
  }

  incrementPayments(type: string, status: string, paymentMethod: string): void {
    this.paymentsTotal.inc({ type, status, payment_method: paymentMethod });
  }

  incrementCertificates(courseId: string): void {
    this.certificatesIssued.inc({ course_id: courseId });
  }

  setActiveSessions(count: number): void {
    this.activeSessions.set(count);
  }

  incrementErrors(type: string, route: string): void {
    this.errorsTotal.inc({ type, route });
  }

  incrementRateLimit(endpoint: string, ip: string): void {
    this.rateLimitExceeded.inc({ endpoint, ip });
  }

  incrementAuthFailures(reason: string): void {
    this.authFailures.inc({ reason });
  }

  setWsConnections(namespace: string, count: number): void {
    this.wsConnections.set({ namespace }, count);
  }

  incrementWsMessages(namespace: string, event: string, direction: 'in' | 'out'): void {
    this.wsMessagesTotal.inc({ namespace, event, direction });
  }

  incrementWsErrors(namespace: string, event: string): void {
    this.wsErrorsTotal.inc({ namespace, event });
  }
}