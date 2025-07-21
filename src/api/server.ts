import { Hono } from 'hono';
import { CoreService } from '@/services';

/**
 * HTTP API Server for the Alert system
 * Provides endpoints for Uptime Kuma to query MQTT server status
 */
export class ApiServer {
  private app: Hono;
  private coreService: CoreService;

  constructor(coreService: CoreService) {
    this.coreService = coreService;
    this.app = new Hono();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Will be implemented in task 5.2
  }

  public getFetchHandler() {
    return this.app.fetch;
  }
}