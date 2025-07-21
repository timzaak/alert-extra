import { ConfigService } from './src/services/config-service.ts';
import { CoreServiceImpl } from './src/services/core-service.ts';
import { MqttClientImpl } from './src/mqtt/mqtt-client-impl.ts';
import { InMemoryStatusRepository } from './src/repositories/status-repository.ts';
import { ApiServer } from './src/api/server.ts';
import { logger, LogLevel, LoggerService } from './src/services/logger-service.ts';

// Application version
const APP_VERSION = '1.0.0';
const APP_NAME = 'Alert MQTT Monitoring Service';

// Global references for cleanup
let coreService: CoreServiceImpl | null = null;
let apiServer: ApiServer | null = null;
let abortController: AbortController | null = null;

/**
 * Configure the logger based on environment variables
 */
function configureLogger(): void {
  // Get log level from environment or use INFO as default
  const logLevelStr = Deno.env.get('LOG_LEVEL') || 'INFO';
  let logLevel = LogLevel.INFO;
  
  switch (logLevelStr.toUpperCase()) {
    case 'DEBUG':
      logLevel = LogLevel.DEBUG;
      break;
    case 'INFO':
      logLevel = LogLevel.INFO;
      break;
    case 'WARN':
      logLevel = LogLevel.WARN;
      break;
    case 'ERROR':
      logLevel = LogLevel.ERROR;
      break;
    case 'NONE':
      logLevel = LogLevel.NONE;
      break;
    default:
      logger.warn(`Invalid log level: ${logLevelStr}, using INFO`);
      logLevel = LogLevel.INFO;
  }
  
  // Configure the logger
  logger.configure({
    level: logLevel,
    prefix: APP_NAME,
    timestamp: true
  });
  
  logger.debug('Logger configured with level:', LogLevel[logLevel]);
}

// Handle shutdown signals
Deno.addSignalListener("SIGINT", async () => {
  logger.info("Received SIGINT signal. Shutting down...");
  await shutdown();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  logger.info("Received SIGTERM signal. Shutting down...");
  await shutdown();
  Deno.exit(0);
});

/**
 * Graceful shutdown function
 * Shuts down all components in reverse order of initialization
 */
async function shutdown(): Promise<void> {
  logger.info("Starting graceful shutdown...");
  
  // Abort any pending HTTP server operations
  if (abortController) {
    logger.debug("Aborting HTTP server...");
    abortController.abort();
    abortController = null;
  }
  
  // Shutdown core service
  if (coreService) {
    logger.debug("Shutting down core service...");
    try {
      await coreService.shutdown();
      logger.debug("Core service shut down successfully");
    } catch (error) {
      logger.error("Error shutting down core service", error);
    } finally {
      coreService = null;
    }
  }
  
  logger.info("Shutdown complete");
}

/**
 * Main application function
 * Initializes all components and starts the server
 */
async function main(): Promise<void> {
  try {
    // Configure logger first
    configureLogger();
    
    // Display startup banner
    logger.info(`Starting ${APP_NAME} v${APP_VERSION}`);
    logger.info(`Runtime: Deno ${Deno.version.deno}`);
    logger.info(`Platform: ${Deno.build.os} ${Deno.build.arch}`);
    
    // Initialize configuration
    logger.info("Loading configuration...");
    const configService = new ConfigService();
    const config = await configService.loadConfig();
    logger.debug("Configuration loaded successfully");
    
    // Create components
    logger.debug("Creating application components...");
    const mqttClient = new MqttClientImpl();
    const statusRepository = new InMemoryStatusRepository();
    
    // Initialize core service
    logger.info("Initializing core service...");
    coreService = new CoreServiceImpl(mqttClient, statusRepository, config);
    await coreService.initialize();
    logger.info("Core service initialized successfully");
    
    // Create API server
    logger.debug("Creating API server...");
    apiServer = new ApiServer(coreService);
    
    // Start server
    logger.info(`Starting HTTP server on ${config.server.host}:${config.server.port}...`);
    abortController = new AbortController();
    
    await Deno.serve({
      port: config.server.port,
      hostname: config.server.host,
      signal: abortController.signal,
      onListen: ({ hostname, port }) => {
        logger.info(`HTTP server listening on http://${hostname}:${port}`);
      }
    }, apiServer.getFetchHandler());
    
  } catch (error) {
    logger.error("Failed to start application", error);
    await shutdown();
    Deno.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error("Unhandled exception in main:", error);
  Deno.exit(1);
});
