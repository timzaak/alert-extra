import { Hono } from 'hono';
import { ConfigService } from './src/services/config-service.ts';

async function main() {
  try {
    // Initialize configuration
    const configService = new ConfigService();
    const config = await configService.loadConfig();
    
    console.log(`Loading configuration...`);
    
    // Create Hono app
    const app = new Hono();
    
    // Basic route for testing
    app.get('/', (c) => {
      return c.text('Alert MQTT Monitoring Service');
    });
    
    // Start server
    console.log(`Starting server on ${config.server.host}:${config.server.port}...`);
    await Deno.serve({
      port: config.server.port,
      hostname: config.server.host
    }, app.fetch);
    
  } catch (error) {
    console.error(`Failed to start application: ${error.message}`);
    Deno.exit(1);
  }
}

// Run the application
main();
