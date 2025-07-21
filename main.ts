import { ConfigService } from './src/services/config-service.ts';
import { CoreServiceImpl } from './src/services/core-service.ts';
import { MqttClientImpl } from './src/mqtt/mqtt-client-impl.ts';
import { InMemoryStatusRepository } from './src/repositories/status-repository.ts';
import { ApiServer } from './src/api/server.ts';

// Global reference to core service for cleanup
let coreService: CoreServiceImpl | null = null;

// Handle shutdown signals
Deno.addSignalListener("SIGINT", async () => {
  console.log("Received SIGINT signal. Shutting down...");
  await shutdown();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  console.log("Received SIGTERM signal. Shutting down...");
  await shutdown();
  Deno.exit(0);
});

// Graceful shutdown function
async function shutdown() {
  if (coreService) {
    console.log("Shutting down core service...");
    await coreService.shutdown();
    coreService = null;
  }
}

async function main() {
  try {
    console.log(`Loading configuration...`);
    
    // Initialize configuration
    const configService = new ConfigService();
    const config = await configService.loadConfig();
    
    // Create components
    const mqttClient = new MqttClientImpl();
    const statusRepository = new InMemoryStatusRepository();
    
    // Initialize core service
    coreService = new CoreServiceImpl(mqttClient, statusRepository, config);
    await coreService.initialize();
    
    // Create API server
    const apiServer = new ApiServer(coreService);
    
    // Start server
    console.log(`Starting server on ${config.server.host}:${config.server.port}...`);
    await Deno.serve({
      port: config.server.port,
      hostname: config.server.host
    }, apiServer.getFetchHandler());
    
  } catch (error) {
    console.error(`Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await shutdown();
    Deno.exit(1);
  }
}

// Run the application
main();
