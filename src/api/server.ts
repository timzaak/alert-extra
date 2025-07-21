import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { CoreService } from "../services/core-service.ts";
import { logger } from "../services/logger-service.ts";
import { createErrorResponse, handleError } from "../utils/error-utils.ts";

/**
 * HTTP API Server for the Alert system
 * Provides endpoints for Uptime Kuma to query MQTT server status
 */
export class ApiServer {
  private app: Hono;
  private coreService: CoreService;

  /**
   * Creates a new instance of ApiServer
   * @param coreService Core service implementation
   */
  constructor(coreService: CoreService) {
    this.coreService = coreService;
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandler();
  }

  /**
   * Set up middleware for the HTTP server
   * - Logger middleware for request logging
   * - CORS middleware for cross-origin requests
   * - Pretty JSON middleware for formatted JSON responses
   */
  private setupMiddleware(): void {
    // Add logger middleware
    this.app.use("*", honoLogger());

    // Add CORS middleware
    this.app.use(
      "*",
      cors({
        origin: "*",
        allowMethods: ["GET"],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
      }),
    );

    // Add pretty JSON middleware for development
    this.app.use("*", prettyJSON());
  }

  /**
   * Set up routes for the HTTP server
   * - Health check endpoint
   * - API version endpoint
   * - MQTT status endpoint
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (c) => {
      return c.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    });

    // API version endpoint
    this.app.get("/version", (c) => {
      return c.json({
        version: "1.0.0",
        name: "Alert MQTT Monitoring Service",
      });
    });

    // MQTT status endpoint
    this.app.get("/mqtt/status", (c) => {
      try {
        const mqttStatus = this.coreService.getMqttStatus();
        return c.json(mqttStatus);
      } catch (error) {
        handleError(error, "Error retrieving MQTT status");
        return c.json(createErrorResponse(error), 500);
      }
    });
  }

  /**
   * Set up error handling middleware
   * - Catches all errors and returns appropriate error responses
   */
  private setupErrorHandler(): void {
    this.app.onError((err, c) => {
      handleError(err, "API Server Error");
      return c.json(createErrorResponse(err), 500);
    });
  }

  /**
   * Get the fetch handler for the HTTP server
   * @returns Fetch handler function for use with Deno.serve
   */
  public getFetchHandler() {
    return this.app.fetch;
  }
}
